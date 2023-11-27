import {action, makeAutoObservable, runInAction} from 'mobx'
import {readFileSync} from 'fs'
import {ShareApi} from './sync/api'
import {IBook, IDoc} from './model'
import {BsFile} from './sync/file'
import {Book} from './sync/book'
import {parserMdToSchema} from '../editor/parser/parser'
import {MainApi} from '../api/main'
import {compareVersions} from 'compare-versions'
import {message$} from '../utils'

export class ShareStore {
  readonly minVersion = '0.2.0'
  remoteVersion = ''
  currentVersion = ''
  docMap = new Map<string, IDoc>()
  bookMap = new Map<string, IBook>()
  file: BsFile
  book: Book
  pausedUpdate = false
  showUpdateTips = false
  updateTips = ''
  serviceConfig: null | {
    domain: string
    secret: string
    name: string
    deviceId: string
  } = null
  api: ShareApi
  constructor() {
    this.api = new ShareApi(this)
    this.file = new BsFile(this.api)
    this.book = new Book(this.api, this.file)
    makeAutoObservable(this, {
      file: false,
      book: false,
      docMap: false,
      bookMap: false
    })
  }
  getBooks(filePath: string) {
    return Array.from(this.bookMap).filter(item => item[1].filePath.startsWith(filePath)).map(item => item[1])
  }
  initial() {
    MainApi.getServerConfig().then(async res => {
      if (res) {
        runInAction(() => this.serviceConfig = res)
        try {
          const v = await this.api.getVersion()
          runInAction(() => this.currentVersion = v.version)
          if (v.version !== localStorage.getItem('ignore-service-version') && !shareStore.pausedUpdate) {
            if (compareVersions(this.minVersion, v.version) === 1) {
              fetch('https://api.github.com/repos/1943time/bluestone-service/releases/latest').then(async res => {
                const data = await res.json() as {
                  tag_name: string
                  body: string
                }
                if (!/-\w+$/.test(data.tag_name) || import.meta.env.DEV) {
                  runInAction(() => {
                    this.updateTips = data.body
                    this.showUpdateTips = true
                    this.remoteVersion = data.tag_name
                  })
                }
              })
            }
          }
          await this.api.getShareData().then(action(res => {
            this.docMap = new Map(res.docs.map(c => [c.filePath, c]))
            this.bookMap = new Map(res.books.map(c => [c.path, c]))
          }))
        } catch (e) {
          console.log('e', e)
          message$.next({
            type: 'error',
            content: 'Custom service connection failed'
          })
        }
      }
    })
  }

  async shareDoc(filePath: string, root = '') {
    const remote = await this.api.prefetchDoc({filePath})
    const md = readFileSync(filePath, {encoding: 'utf-8'})
    const hash = window.api.md5(md)
    if (hash !== remote.doc.hash) {
      const [schema] = await parserMdToSchema([md], true)
      const filesSet = await this.file.docFile({
        schema, docId: remote.doc.id, files: remote.deps, filePath, root
      })
      const remove = remote.deps.filter(d => !filesSet.has(d.filePath)).map(d => d.id)
      await this.api.shareDoc({
        id: remote.doc.id, schema: JSON.stringify(schema), remove, hash: hash
      })
    }
    this.docMap.set(remote.doc.filePath, remote.doc)
    return remote.doc
  }

  async shareBook(data: Partial<IBook>) {
    return this.book.syncBook(data).then(res => {
      this.bookMap.set(res.book.path, res.book)
      return res
    })
  }

  async delBook(book: IBook) {
    return this.api.delBook(book.id).then(() => this.bookMap.delete(book.path))
  }
  clear() {
    this.docMap.clear()
    this.bookMap.clear()
  }

  reset() {
    return MainApi.saveServerConfig(null).then(() => {
      this.docMap.clear()
      this.bookMap.clear()
      runInAction(() => {
        this.serviceConfig = null
      })
    })
  }
  async delDevice(id: string) {
    return this.api.delDevice(id).then(async () => {
      if (id === this.serviceConfig?.deviceId) {
        this.docMap.clear()
        this.bookMap.clear()
        runInAction(() => {
          this.serviceConfig = null
        })
        await window.electron.ipcRenderer.invoke('saveServerConfig', null)
      }
    })
  }
}

export const shareStore = new ShareStore()
