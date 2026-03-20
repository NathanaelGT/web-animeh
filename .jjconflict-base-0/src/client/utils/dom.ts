export const createElement = <TTagName extends keyof HTMLElementTagNameMap = 'div'>(
  className = '',
  tagName: TTagName = 'div' as TTagName,
): HTMLElementTagNameMap[TTagName] => {
  const el = document.createElement(tagName)

  el.className = className

  return el
}
