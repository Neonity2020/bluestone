import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {SetNodeToDecorations, useHighlight} from '../editor/plugins/useHighlight'
import {Placeholder} from '../editor/tools/Placeholder'
import {Editable, ReactEditor, Slate, withReact} from 'slate-react'
import {MElement, MLeaf} from '../editor/elements'
import {EditorUtils} from '../editor/utils/editorUtils'
import {EditorStore, EditorStoreContext} from '../editor/store'
import {observer} from 'mobx-react-lite'
import {configStore} from '../store/config'
import {parserMdToSchema} from '../editor/parser/parser'
import {readFileSync} from 'fs'
import {useLocalState} from '../hooks/useLocalState'
import {Title} from '../editor/tools/Title'
import isHotkey from 'is-hotkey'
import {Editor, Transforms} from 'slate'
import {parse} from 'path'
import {action, runInAction} from 'mobx'

export const Webview = observer((props: {
  value?: any[]
  history?: boolean
  filePath?: string
}) => {
  const [state, setState] = useLocalState({
    ready: !!props.history,
    name: ''
  })
  const store = useMemo(() => new EditorStore(true, props.history), [])
  const renderElement = useCallback((props: any) => <MElement {...props} children={props.children}/>, [])
  const renderLeaf = useCallback((props: any) => <MLeaf {...props} children={props.children}/>, [])
  const high = useHighlight(store)
  const print = async (filePath: string) => {
    store.webviewFilePath = filePath
    setState({ready: true, name: parse(filePath).name})
    const [res] = await parserMdToSchema([{filePath}])
    EditorUtils.reset(store.editor, res.schema || [])
    setTimeout(() => {
      window.electron.ipcRenderer.send('print-pdf-ready', filePath)
    }, 300)
  }
  useEffect(() => {
    if (!props.history) window.electron.ipcRenderer.invoke('print-dom-ready').then(print)
  }, [])

  useEffect(() => {
    runInAction(() => store.pauseCodeHighlight = true)
    EditorUtils.reset(store.editor, props.value)
    store.webviewFilePath = props.filePath || null
    setState({name: parse(props.filePath || '').name})
    requestIdleCallback(() => {
      runInAction(() => {
        store.pauseCodeHighlight = false
        setTimeout(action(() => {
          store.refreshHighlight = !store.refreshHighlight
        }))
      })
    })
  }, [props.value, props.filePath])

  if (!state.ready) return null
  return (
    <div className={`view w-full ${props.history ? '' : 'h-full'} content py-5 px-8 heading-line ${props.history ? '' : 'pdf'}`}>
      <EditorStoreContext.Provider value={store}>
        <Slate
          editor={store.editor}
          initialValue={[]}
        >
          <SetNodeToDecorations/>
          <input defaultValue={state.name} className={'page-title'}/>
          <Editable
            decorate={props.history ? high : undefined}
            spellCheck={false}
            readOnly={true}
            className={'w-full h-full'}
            renderElement={renderElement}
            renderLeaf={renderLeaf}
          />
        </Slate>
      </EditorStoreContext.Provider>
    </div>
  )
})
