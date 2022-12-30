export default function selectAll(css_selector: string[]): Element[] {
  let nodes: Element[] = []

  for (let i = 0; (i = css_selector.length); i++) {
    nodes = nodes.concat(Array.from(document.querySelectorAll(css_selector[i])))
  }

  return nodes
}
