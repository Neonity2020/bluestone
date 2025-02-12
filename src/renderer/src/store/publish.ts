import { join } from 'path'
import { db } from './db'
import {IApi} from '@inkdown/client'
import { Core } from './core'
import { isWindows } from '../utils'
export class Publish {
  access_key_id = ''
  access_key_secret = ''
  host = ''
  api: InstanceType<typeof IApi> | null = null
  curDocPath = ''
  constructor(
    private readonly core: Core
  ) {
    this.init()
  }
  private createToken(id: string, secret: string, expires = '365 days') {
    return window.api.jwtSign({ logged: true, id }, `${id}:${secret}`, expires)
  }
  private createApi(data: {
    host: string
    access_key_id: string
    access_key_secret: string
  }) {
    const token = this.createToken(data.access_key_id, data.access_key_secret)
    return new IApi({
      fetch: window.fetch.bind(window),
      mode: 'inkdown',
      os: isWindows ? 'windows' : 'other',
      getFileData: async (path) => {
        try {
          const buffer = await window.api.fs.readFile(path)
          return new File([buffer.buffer as ArrayBuffer], '')
        } catch(e) {
          this.core.message.warning(`File "${join(this.curDocPath, '..', path)}" does not exist`)
          return null
        }
      },
      sha1: (str: string) => {
        return window.api.sha1(str)
      },
      url: data.host,
      token: token
    })
  }
  private async init() {
    this.access_key_id = (await db.config.get('access_key_id'))?.value || ''
    this.access_key_secret = (await db.config.get('access_key_secret'))?.value || ''
    this.host = (await db.config.get('pb_host'))?.value || ''
    if (this.host) {
      this.api = this.createApi({
        host: this.host,
        access_key_id: this.access_key_id,
        access_key_secret: this.access_key_secret
      })
    }
  }
  async reset() {
    this.api = null
    db.config.delete('pb_host')
    db.config.delete('access_key_id')
    db.config.delete('access_key_secret')
    this.host = ''
    this.access_key_id = ''
    this.access_key_secret = ''
    this.api = null
  }
  async connect(data: {
    host: string
    access_key_id: string
    access_key_secret: string
  }) {
    try {
      this.api = this.createApi(data)
      await this.api.getEnv()
      this.host = data.host
      this.access_key_id = data.access_key_id
      this.access_key_secret = data.access_key_secret
      await db.config.put({key: 'pb_host',value: data.host}, 'pb_host')
      await db.config.put({key: 'access_key_id',value: data.access_key_id}, 'access_key_id')
      await db.config.put({key: 'access_key_secret',value: data.access_key_secret}, 'access_key_secret')
    } catch(e) {
      this.api = null
      throw e
    }
  }
}
