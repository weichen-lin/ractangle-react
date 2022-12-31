import React, { createRef, useEffect, useState } from 'react'
import addCss from './utils/addCss'
import intersects from './utils/intersects'
import { selectionStore, selectionParams } from './utils/types'

class Selectable {
  private readonly _selectContainer: HTMLElement
  private readonly _selectArea: HTMLElement
  private readonly _document = window?.document
  private readonly _selectBoundary: HTMLElement
  private _isMouseDownAtsSelectBoundary: boolean = false
  private readonly _initMouseDown = new DOMRect()
  // private _selectableElement: Element[]
  private readonly cb: (...args: any[]) => any

  private _selectionStore: selectionStore = {
    stored: [],
    canSelected: [],
    changed: {
      added: [], // Added elements since last selection
      removed: [], // Removed elements since last selection
    },
  }

  constructor(params: selectionParams) {
    this._selectContainer = this._document.createElement('div')
    this._selectArea = this._document.createElement('div')
    this._selectArea.classList.add(params.selectAreaClassName)
    this._selectContainer.appendChild(this._selectArea)
    this._selectBoundary = params.boundary
    this.cb = params.cb
    // stying area
    addCss(this._selectContainer, {
      overflow: 'hidden',
      position: 'fixed',
      transform: 'translate3d(0, 0, 0)', // https://stackoverflow.com/a/38268846
      pointerEvents: 'none',
      zIndex: '1',
    })

    addCss(this._selectArea, {
      willChange: 'top, left, bottom, right, width, height',
      top: 0,
      left: 0,
      position: 'fixed',
      width: 0,
      height: 0,
      display: 'none',
    })

    this._document.body.appendChild(this._selectContainer)

    this._document.addEventListener('mousedown', this.onMouseDown)
    this._document.addEventListener('mouseup', this.onMouseUp)
    this._document.addEventListener('mousemove', this.onMouseMove)
  }

  onMouseDown = (evt: MouseEvent) => {
    const { clientX, clientY } = evt
    this._initMouseDown.x = clientX
    this._initMouseDown.y = clientY

    const { x, y, right, bottom } = this._selectBoundary.getBoundingClientRect()
    if (clientX - x > 0 && clientY - y > 0) {
      this._isMouseDownAtsSelectBoundary = true
      addCss(this._selectContainer, {
        top: y,
        left: x,
        width: right - x,
        height: bottom - y,
      })
    }
    const selecatables: Element[] = Array.from(
      this._document.querySelectorAll('.selectable')
    )

    this._selectionStore.canSelected = selecatables
  }

  onMouseUp = () => {
    this._isMouseDownAtsSelectBoundary = false
    addCss(this._selectArea, {
      willChange: 'top, left, bottom, right, width, height',
      top: 0,
      left: 0,
      position: 'fixed',
      width: 0,
      height: 0,
      display: 'none',
    })

    // this._document.removeEventListener('mousedown', this.onMouseDown)
    // this._document.removeEventListener('mouseup', this.onMouseUp)
    // this._document.removeEventListener('mousemove', this.onMouseMove)
  }

  onMouseMove = (evt: MouseEvent) => {
    // console.log(evt.target)
    if (this._isMouseDownAtsSelectBoundary) {
      const { clientX, clientY } = evt
      const { x, y } = this._initMouseDown
      const { x: boundary_x, y: boundary_y } =
        this._selectBoundary.getBoundingClientRect()

      addCss(this._selectArea, {
        width: clientX >= x ? clientX - x : x - clientX,
        height: clientY >= y ? clientY - y : y - clientY,
        top: clientY >= y ? y - boundary_y : clientY - boundary_y,
        left: clientX >= x ? x - boundary_x : clientX - boundary_x,
        display: 'block',
      })

      for (let i = 0; i < this._selectionStore.canSelected.length; i++) {
        const currentElement = this._selectionStore.canSelected[i]
        const currentElementPrefix =
          Number(
            currentElement
              .getAttribute('data-key')
              ?.match(/selectable-(\d+)/)![1]
          ) ?? 0

        if (intersects(this._selectArea, currentElement)) {
          if (this._selectionStore.stored.includes(currentElementPrefix)) {
            continue
          } else {
            this._selectionStore.changed.added.push(currentElementPrefix)
            this._selectionStore.stored.push(currentElementPrefix)
          }
        } else {
          if (this._selectionStore.stored.includes(currentElementPrefix)) {
            const currentIndex =
              this._selectionStore.stored.indexOf(currentElementPrefix)
            this._selectionStore.stored.splice(currentIndex)
            this._selectionStore.changed.removed.push(currentElementPrefix)
          } else {
            continue
          }
        }
      }
      this.cb(this._selectionStore)
      this._selectionStore.changed.added.length = 0
      this._selectionStore.changed.removed.length = 0
    }
  }
}

const App = () => {
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const root = createRef<HTMLDivElement>()

  interface SelectionEvent {
    stored: number[]
    canSelected: Element[]
    changed: {
      added: number[]
      removed: number[]
    }
  }

  const handleSelected = ({
    stored,
    changed: { added, removed },
  }: SelectionEvent) => {
    const newSelected = new Set<number>(stored)
    added.forEach((e) => newSelected.add(e))
    removed.forEach((e) => newSelected.delete(e))

    setSelected(newSelected)
  }

  useEffect(() => {
    const a = new Selectable({
      boundary: root?.current as HTMLDivElement,
      selectAreaClassName: 'selection-area',
      selectablePrefix: 'selectable',
      cb: handleSelected,
    })
  }, [])

  return (
    <div className='container' ref={root}>
      {Array.from(Array(8).keys()).map((ele, index) => {
        return (
          <div
            className={`box selectable ${
              selected.has(index) ? 'selected' : ''
            }`}
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
