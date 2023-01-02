export interface selectionStore {
  stored: string[]
  dragStored: Element[]
  canSelected: Element[]
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
}
