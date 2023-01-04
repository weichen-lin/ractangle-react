export interface selectedElement {
  element: Element
  memorizePosition: Partial<DOMRect>
}

export interface selectionStore {
  stored: string[]
  dragStored: Element[]
  canSelected: Map<string, selectedElement>
  changed: {
    added: string[]
    removed: string[]
  }
}

export interface selectionParams {
  boundary: HTMLDivElement
  selectAreaClassName: string
  selectablePrefix: string
  select_cb: (...args: any[]) => any
  drag_cb: (...args: any[]) => any
}

export enum StoreAction {
  Pass,
  Add,
  Delete
}
