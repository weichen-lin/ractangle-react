export default (evt: MouseEvent, canSelected: Element[]) => {
  const target = evt.target as Element
  return {
    isCtrlKey: evt.ctrlKey,
    isClickOnSelectable: canSelected.includes(target),
    onClickElement: target.getAttribute('data-key') ?? '',
  }
}
