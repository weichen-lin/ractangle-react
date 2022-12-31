export interface selectionStore {
  stored: number[]
  canSelected: Element[]
  changed: {
    added: number[]
    removed: number[]
  }
}

export interface selectionParams {
  boundary: HTMLDivElement
  selectAreaClassName: string
  selectablePrefix: string
  cb: (...args: any[]) => any
}
