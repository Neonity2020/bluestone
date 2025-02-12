import { CodeNode } from '../../../types/el'
import { useGetSetState, useUpdateEffect } from 'react-use'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import mermaid from 'mermaid'
import { observer } from 'mobx-react-lite'
import { useCoreContext } from '../../../store/core'
import { useEditorStore } from '../../store'
import { EditorUtils } from '../../utils/editorUtils'

export const Mermaid = observer((props: {
  el: CodeNode
}) => {
  const core = useCoreContext()
  const store = useEditorStore()
  const [state, setState] = useGetSetState({
    code: '',
    error: ''
  })
  const divRef = useRef<HTMLDivElement>(null)
  const timer = useRef(0)
  const id = useMemo(() => 'm' + (Date.now() + Math.ceil(Math.random() * 1000)), [])
  const render = useCallback(() => {
    mermaid.render(id, state().code).then(res => {
      setState({error: ''})
      divRef.current!.innerHTML = res.svg
    }).catch(e => {
      mermaid.parse(state().code).catch(e => {
        setState({error: e.toString(), code: ''})
      })
    }).finally(() => {
      document.querySelector('#d' + id)?.classList.add('hidden')
    })
  }, [])

  useUpdateEffect(() => {
    setTimeout(() => {
      render()
    })
  }, [core.config.state.dark])

  useEffect(() => {
    const code = props.el.code || ''
    if (state().code !== code) {
      clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        setState({code: code})
        if (state().code) {
          render()
        } else {
          setState({error: ''})
        }
      }, !state().code ? 0 : 300)
    }
    return () => window.clearTimeout(timer.current)
  }, [props.el])
  return (
    <div
      className={'mermaid-container'}
      contentEditable={false}
      onClick={() => {
        const editor = store.codes.get(props.el)
        if (editor) {
          EditorUtils.focusAceEnd(editor)
        }
      }}
    >
      <div contentEditable={false} ref={divRef}
           className={`w-full flex justify-center ${state().code && !state().error ? '' : 'hidden'}`}></div>
      {state().error &&
        <div className={'text-center text-red-500/80'}>{state().error}</div>
      }
      {!state().code && !state().error &&
        <div className={'text-center text-gray-500'}>Empty</div>
      }
    </div>
  )
})
