import React, { createRef, useEffect, useState } from 'react'
import addCss from './utils/addCss'
import intersects from './utils/intersects'
import checkClickStatus from './utils/clickStatus'
import { cloneTargetIntoDragList } from './utils/cloneCurrent'

import { selectionStore, selectionParams } from './utils/types'

class Selectable {
  private readonly _selectContainer: HTMLElement
  private readonly _selectArea: HTMLElement
  private readonly _document = window?.document
  private readonly _selectBoundary: HTMLElement
  private readonly _dragContainer: HTMLElement
  private _isMouseDownAtSelectBoundary: boolean = false
  private _needClearStored: boolean = false
  private _gonnaStartDrag: boolean = false
  private _isDragging: boolean = false
  private cacheLastElement: string = ''
  private readonly _initMouseDown = new DOMRect()
  private readonly select_cb: (...args: any[]) => any

  private _selectionStore: selectionStore = {
    stored: [],
    dragStored: [],
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

    this._dragContainer = this._document.createElement('div')

    this.select_cb = params.select_cb

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

    addCss(this._dragContainer, {
      overflow: 'hidden',
      position: 'fixed',
      transform: 'translate3d(0, 0, 0)', // https://stackoverflow.com/a/38268846
      pointerEvents: 'none',
      zIndex: '10',
      width: '100%',
      height: '100%',
      top: 0,
      left: 0,
    })

    this._document.body.appendChild(this._selectContainer)
    this._document.body.appendChild(this._dragContainer)

    this._document.addEventListener('mousedown', this.onMouseDown)
    this._document.addEventListener('mouseup', this.onMouseUp)
    this._document.addEventListener('mousemove', this.onMouseMove)
  }

  onMouseDown = (evt: MouseEvent) => {
    const { clientX, clientY } = evt
    this._initMouseDown.x = clientX
    this._initMouseDown.y = clientY
    const selecatables: Element[] = Array.from(
      this._document.querySelectorAll('.selectable')
    )
    this._selectionStore.canSelected = selecatables
    const { isCtrlKey, isClickOnSelectable, onClickElement } = checkClickStatus(
      evt,
      this._selectionStore.canSelected
    )

    if (isCtrlKey && isClickOnSelectable) {
      this._needClearStored = false
      if (this._selectionStore.stored.includes(onClickElement)) {
        const currentIndex = this._selectionStore.stored.indexOf(onClickElement)
        this._selectionStore.stored.splice(currentIndex, 1)
        this._selectionStore.changed.removed.push(onClickElement)
      } else {
        this._selectionStore.changed.added.push(onClickElement)
        this._selectionStore.stored.push(onClickElement)
      }

      this.select_cb(this._selectionStore)

      this._selectionStore.changed.added.length = 0
      this._selectionStore.changed.removed.length = 0
    } else if (!isCtrlKey && isClickOnSelectable) {
      this._needClearStored = true
      this._gonnaStartDrag = true

      if (!this._selectionStore.stored.includes(onClickElement)) {
        this.cacheLastElement = onClickElement
      }
      if (this._selectionStore.stored.includes(onClickElement)) {
        const currentIndex = this._selectionStore.stored.indexOf(onClickElement)
        this._selectionStore.stored.splice(currentIndex, 1)
        this._selectionStore.changed.removed.push(onClickElement)
      } else {
        this._selectionStore.changed.added.push(onClickElement)
        this._selectionStore.stored.push(onClickElement)
      }

      this.select_cb(this._selectionStore)

      this._selectionStore.changed.added.length = 0
      this._selectionStore.changed.removed.length = 0
    } else if (!isClickOnSelectable) {
      this._needClearStored = true
      const { x, y, right, bottom } =
        this._selectBoundary.getBoundingClientRect()
      if (clientX - x > 0 && clientY - y > 0) {
        this._isMouseDownAtSelectBoundary = true
        addCss(this._selectContainer, {
          top: y,
          left: x,
          width: right - x,
          height: bottom - y,
        })
      }
    }

    this.makeElementShadow(evt)
  }

  onMouseUp = () => {
    this._isMouseDownAtSelectBoundary = false
    this._gonnaStartDrag = false
    addCss(this._selectArea, {
      willChange: 'top, left, bottom, right, width, height',
      top: 0,
      left: 0,
      position: 'fixed',
      width: 0,
      height: 0,
      display: 'none',
    })

    if (this._needClearStored) {
      this._selectionStore.stored.length = 0

      if (this.cacheLastElement !== '') {
        this._selectionStore.stored.push(this.cacheLastElement)
      }
      this.select_cb(this._selectionStore)
    }

    this._needClearStored = false
    this._gonnaStartDrag = false
    this.cacheLastElement = ''
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
        display: 'block',
      })

      for (let i = 0; i < this._selectionStore.canSelected.length; i++) {
        const currentElement = this._selectionStore.canSelected[i]
        const currentElementPrefix =
          currentElement.getAttribute('data-key') ?? 'default'

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
            this._selectionStore.stored.splice(currentIndex, 1)
            this._selectionStore.changed.removed.push(currentElementPrefix)
          } else {
            continue
          }
        }
      }
      this.select_cb(this._selectionStore)
      this._selectionStore.changed.added.length = 0
      this._selectionStore.changed.removed.length = 0
    }

    if (this._gonnaStartDrag) {
      const { pageX, pageY } = evt
      this._selectionStore.dragStored.forEach((cloned, index) => {
        if (index === 1) {
          addCss(cloned as HTMLElement, {
            top: pageY - 20,
            left: pageX - 25,
            height: 30,
            width: 30,
            opacity: '0%',
            transitionDuration: '0.2s',
            transitionProperty: 'width height top left',
          })
        } else {
          addCss(cloned as HTMLElement, {
            top: pageY - 20,
            left: pageX - 25,
            height: 20,
            width: 20,
            opacity: '0%',
            transitionDuration: '0.2s',
            transitionProperty: 'width height top left',
          })
        }
      })
      this._document.removeEventListener('mousemove', this.onMouseMove)
      this._document.addEventListener('mousemove', this.onDelayMove)
    }
  }

  onDelayMove = (evt: MouseEvent) => {
    const { pageX, pageY } = evt
    if (this._selectionStore.dragStored.length >= 1) {
      addCss(this._selectionStore.dragStored[0] as HTMLElement, {
        top: pageY - 20,
        left: pageX - 25,
        height: 20,
        width: 20,
        opacity: '20%',
        transitionDuration: '0s',
        transitionDelay: '0s',
        transitionProperty: 'width height top left',
      })
    }
  }

  makeElementShadow = (evt: MouseEvent) => {
    this._dragContainer.replaceChildren()
    this._selectionStore.dragStored.length = 0
    this._selectionStore.stored.forEach((e) => {
      const ele = this._selectionStore.canSelected.find(
        (ele) => ele.getAttribute('data-key') === e
      )
      if (!ele) return
      const { x, y } = ele.getBoundingClientRect()
      const cloned = ele.cloneNode(true) as HTMLElement
      addCss(cloned, {
        position: 'fixed',
        top: y - 25,
        left: x - 25,
        transitionProperty: 'all',
        display: 'block',
        // transitionDelay: '0.5s',
      })
      this._dragContainer.appendChild(cloned)
      this._selectionStore.dragStored.push(cloned)
    })
  }
}

const App = () => {
  const [selected, setSelected] = useState<Set<string>>(new Set())

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
    changed: { added, removed },
  }: SelectionEvent) => {
    const newSelected = new Set<string>(stored)
    added.forEach((e) => newSelected.add(e))
    removed.forEach((e) => newSelected.delete(e))

    setSelected(newSelected)
  }

  useEffect(() => {
    const a = new Selectable({
      boundary: root?.current as HTMLDivElement,
      selectAreaClassName: 'selection-area',
      selectablePrefix: 'selectable',
      select_cb: handleSelected,
    })
  }, [])

  return (
    <div className='container' ref={root}>
      {Array.from(Array(8).keys()).map((ele, index) => {
        return (
          <div
            className={`box selectable ${
              selected.has(`selectable-${index}`) ? 'selected' : ''
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
