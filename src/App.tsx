import React, { createRef, useEffect, useState } from 'react'
import Selectable from './selectable'

const App = () => {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dragged, setDragged] = useState<Set<string>>(new Set())

  const root = createRef<HTMLDivElement>()

  interface SelectionEvent {
    stored: string[]
    canSelected: Element[]
    changed: {
      added: string[]
      removed: string[]
    }
  }

  const handleSelected = ({
    stored,
    changed: { added, removed }
  }: SelectionEvent) => {
    const newSelected = new Set<string>(stored)
    added.forEach((e) => newSelected.add(e))
    removed.forEach((e) => newSelected.delete(e))

    setSelected(newSelected)
  }

  const handleDragged = ({
    stored,
    changed: { added, removed }
  }: SelectionEvent) => {
    const newSelected = new Set<string>(stored)
    added.forEach((e) => newSelected.add(e))
    removed.forEach((e) => newSelected.delete(e))

    setDragged(newSelected)
  }

  const handleTransform = (e: Element) => {
    return e
  }

  const handleRevert = (e: Element) => {
    return e
  }

  useEffect(() => {
    const a = new Selectable({
      boundary: root?.current as HTMLDivElement,
      selectAreaClassName: 'selection-area',
      selectablePrefix: 'selectable',
      select_cb: handleSelected,
      drag_cb: handleDragged,
      transformFunc: {
        transform: {
          func: handleTransform,
          css: {
            width: 200,
            margin: 0,
            height: 80,
            textAlign: 'center'
          }
        },
        revert: {
          func: handleRevert,
          css: {
            width: 108,
            margin: 30,
            opacity: '100%',
            willChange: 'top left width height'
          }
        },
        iconPositionX: 200
      }
    })
  }, [])

  return (
    <div className='container' ref={root}>
      {Array.from(Array(8).keys()).map((ele, index) => {
        return (
          <div
            className={`box selectable ${
              selected.has(`selectable-${index}`) ? 'selected' : ''
            } ${dragged.has(`selectable-${index}`) ? 'onDrag' : ''}`}
            key={`index ${index}`}
            data-key={`selectable-${index}`}
          >
            {ele + 1}
          </div>
        )
      })}
    </div>
  )
}

export default App
