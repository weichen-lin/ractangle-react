export default (evt: MouseEvent) => {
  const target = evt.target as Element
  const key = target.getAttribute('data-key')
  return {
    isCtrlKey: evt.ctrlKey || evt.metaKey,
    isClickOnSelectable: key ? true : false,
    onClickElement: key
  }
}
