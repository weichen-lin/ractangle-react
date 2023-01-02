const cloneTargetIntoDragList = (
  ele: Element,
  stored: string[],
  dragList: Element[]
) => {
  dragList.length = 0

  const targetKey = ele.getAttribute('data-key')
  if (!targetKey) return
  const targetClone = ele.cloneNode(true) as Element
  const checker = dragList.find(
    (drag) => drag.getAttribute('data-key') === targetKey
  )
  if (!checker) {
    dragList.push(targetClone)
  } else {
    const index = dragList.indexOf(checker)
    dragList.splice(index, 1)
  }
}

export { cloneTargetIntoDragList }
