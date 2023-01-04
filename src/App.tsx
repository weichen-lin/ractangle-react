import React, { createRef, useEffect, useState } from 'react'
import addCss from './utils/addCss'
import intersects from './utils/intersects'
import checkClickStatus from './utils/clickStatus'

import {
  selectionStore,
  selectionParams,
  selectedElement,
  StoreAction
} from './utils/types'

class Selectable {
  private readonly _selectContainer: HTMLElement
  private readonly _selectArea: HTMLElement
  private readonly _document = window?.document
  private readonly _selectBoundary: HTMLElement
  private readonly _dragContainer: HTMLElement
  private _isMouseDownAtSelectBoundary: boolean = false
  private _needClearStored: boolean = false
  private _gonnaStartDrag: boolean = false
  private cacheLastElement: string = ''
  private readonly _initMouseDown = new DOMRect()
  private readonly select_cb: (...args: any[]) => any
  private readonly drag_cb: (...args: any[]) => any

  private _selectionStore: selectionStore = {
    stored: [],
    dragStored: [],
    canSelected: new Map<string, selectedElement>(),
    changed: {
      added: [], // Added elements since last selection
      removed: [] // Removed elements since last selection
    }
  }

  constructor(params: selectionParams) {
    this._selectContainer = this._document.createElement('div')
    this._selectArea = this._document.createElement('div')
    this._selectArea.classList.add(params.selectAreaClassName)
    this._selectContainer.appendChild(this._selectArea)
    this._selectBoundary = params.boundary

    this._dragContainer = this._document.createElement('div')
    this._dragContainer.id = 'dragContainer'
    this.select_cb = params.select_cb
    this.drag_cb = params.drag_cb

    // stying area
    addCss(this._selectContainer, {
      overflow: 'hidden',
      position: 'fixed',
      transform: 'translate3d(0, 0, 0)', // https://stackoverflow.com/a/38268846
      pointerEvents: 'none',
      zIndex: '1',
      padding: 0,
      margin: 0
    })

    addCss(this._selectArea, {
      willChange: 'top, left, bottom, right, width, height',
      top: 0,
      left: 0,
      position: 'fixed',
      width: 0,
      height: 0,
      display: 'none'
    })

    addCss(this._dragContainer, {
      overflow: 'hidden',
      position: 'fixed',
      transform: 'translate3d(0, 0, 0)', // https://stackoverflow.com/a/38268846
      pointerEvents: 'none',
      zIndex: '10',
      width: '100%',
      height: '100%',
      top: 0,
      left: 0
    })

    this._document.body.appendChild(this._selectContainer)
    this._document.body.appendChild(this._dragContainer)

    this._document.addEventListener('mousedown', this.onMouseDown)
    this._document.addEventListener('mouseup', this.onMouseUp)
  }

  onMouseDown = (evt: MouseEvent) => {
    const { clientX, clientY } = evt
    this._initMouseDown.x = clientX
    this._initMouseDown.y = clientY

    this._document.querySelectorAll('.selectable').forEach((e) => {
      const { x, y } = e.getBoundingClientRect()

      const key = e.getAttribute('data-key')
      if (!key) return
      this._selectionStore.canSelected.set(key, {
        element: e,
        memorizePosition: { x, y }
      })
    })

    const { isCtrlKey, isClickOnSelectable, onClickElement } =
      checkClickStatus(evt)

    if (!onClickElement) {
      this._needClearStored = true
      const { x, y, right, bottom } =
        this._selectBoundary.getBoundingClientRect()
      if (clientX - x > 0 && clientY - y > 0) {
        this._isMouseDownAtSelectBoundary = true
        addCss(this._selectContainer, {
          top: y,
          left: x,
          width: right - x,
          height: bottom - y
        })
      }
      this._document.addEventListener('mousemove', this.onMouseMove)
      return
    }

    if (isCtrlKey && isClickOnSelectable) {
      this.storeManipulate(onClickElement, (e: string) => {
        return this._selectionStore.stored.includes(e)
          ? StoreAction.Delete
          : StoreAction.Add
      })
    } else if (!isCtrlKey && isClickOnSelectable) {
      const isStoredAlready =
        this._selectionStore.stored.includes(onClickElement)

      if (!isStoredAlready) {
        const currentElement = Array.from(this._selectionStore.stored)
        this.storeManipulate(currentElement, (e: string) => {
          return this._selectionStore.stored.includes(e)
            ? StoreAction.Delete
            : StoreAction.Add
        })
        this.storeManipulate(onClickElement, (e: string) => {
          return this._selectionStore.stored.includes(e)
            ? StoreAction.Delete
            : StoreAction.Add
        })
        return
      }
      this.cacheLastElement = onClickElement
      this._gonnaStartDrag = true
      this._selectionStore.stored.forEach((key) => {
        const ele = this._selectionStore.canSelected.get(key)
        if (!ele) return
        const { x, y } = ele.element.getBoundingClientRect()
        // const { pageX, pageY } = evt

        const cloned = ele.element.cloneNode(true)
        addCss(cloned as HTMLElement, {
          position: 'fixed',
          top: y - 30,
          left: x - 30,
          opacity: '100%',
          willChange: 'top left width height'
        })
        this._dragContainer.appendChild(cloned)
      })
      this._document.addEventListener('mousemove', this.onDelayMove)
    }
  }

  onMouseUp = () => {
    this._isMouseDownAtSelectBoundary = false
    this._gonnaStartDrag = false
    this._selectionStore.canSelected.clear()
    addCss(this._selectArea, {
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      display: 'none'
    })

    if (this._needClearStored) {
      this._selectionStore.stored.length = 0
      this.select_cb(this._selectionStore)
    }

    if (this.cacheLastElement !== '') {
      this.storeManipulate(this.cacheLastElement, () => StoreAction.Delete)
    }

    this._needClearStored = false
    this._gonnaStartDrag = false
    this.cacheLastElement = ''
    this._dragContainer.replaceChildren()
    this._document.removeEventListener('mousemove', this.onDragMovetoCursor)
  }

  onMouseMove = (evt: MouseEvent) => {
    this._needClearStored = false

    if (this._isMouseDownAtSelectBoundary) {
      const { clientX, clientY } = evt
      const { x, y } = this._initMouseDown
      const { x: boundary_x, y: boundary_y } =
        this._selectBoundary.getBoundingClientRect()

      addCss(this._selectArea, {
        width: clientX >= x ? clientX - x : x - clientX,
        height: clientY >= y ? clientY - y : y - clientY,
        top: clientY >= y ? y - boundary_y : clientY - boundary_y,
        left: clientX >= x ? x - boundary_x : clientX - boundary_x,
        display: 'block'
      })

      const elements = Array.from(this._selectionStore.canSelected.keys())

      this.storeManipulate(elements, (e: string) => {
        const ele = this._selectionStore.canSelected.get(e)?.element
        if (!ele) return StoreAction.Pass
        if (intersects(this._selectArea, ele)) {
          if (this._selectionStore.stored.includes(e)) {
            return StoreAction.Pass
          } else {
            return StoreAction.Add
          }
        } else {
          if (this._selectionStore.stored.includes(e)) {
            return StoreAction.Delete
          } else {
            return StoreAction.Pass
          }
        }
      })
    }

    if (this._gonnaStartDrag) {
      this._document.removeEventListener('mousemove', this.onMouseMove)
      this._document.addEventListener('mousemove', this.onDelayMove)
    }
  }

  onDelayMove = (evt: MouseEvent) => {
    const { pageX, pageY } = evt
    this.cacheLastElement = ''

    this.drag_cb(this._selectionStore)

    this._document
      .querySelector('#dragContainer')
      ?.childNodes.forEach((ele, index) => {
        addCss(ele as HTMLElement, {
          position: 'fixed',
          top: pageY - 30,
          left: pageX - 30,
          height: 24,
          opacity: index > 0 ? '70%' : '90%',
          transitionDuration: '0.15s',
          transitionProperty: 'width height opacity top left',
          zIndex: index > 0 ? '1' : '10',
          transform: `translateX(${index}px)`
        })
      })

    setTimeout(() => {
      this._document.removeEventListener('mousemove', this.onDelayMove)
      this._document.addEventListener('mousemove', this.onDragMovetoCursor)
    }, 150)
  }

  onDragMovetoCursor = (evt: MouseEvent) => {
    const { pageX, pageY } = evt

    this._document
      .querySelector('#dragContainer')
      ?.childNodes.forEach((ele, index) => {
        addCss(ele as HTMLElement, {
          top: pageY - 30,
          left: pageX - 30,
          transitionDuration: '0s'
        })
      })
  }

  storeManipulate = (
    e: string | string[],
    checkerFunc: (e: string) => number
  ) => {
    const elements = Array.isArray(e) ? e : [e]
    for (const e of elements) {
      const checker = checkerFunc(e)

      switch (checker) {
        case StoreAction.Pass:
          break
        case StoreAction.Add:
          this._selectionStore.changed.added.push(e)
          this._selectionStore.stored.push(e)
          break
        case StoreAction.Delete:
          const currentIndex = this._selectionStore.stored.indexOf(e)
          this._selectionStore.stored.splice(currentIndex, 1)
          this._selectionStore.changed.removed.push(e)
          break
        default:
          break
      }
    }

    this.select_cb(this._selectionStore)

    this._selectionStore.changed.added.length = 0
    this._selectionStore.changed.removed.length = 0
  }
}

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

  useEffect(() => {
    const a = new Selectable({
      boundary: root?.current as HTMLDivElement,
      selectAreaClassName: 'selection-area',
      selectablePrefix: 'selectable',
      select_cb: handleSelected,
      drag_cb: handleDragged
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
