/**
 * Caret geometry for a monospace textarea.
 *
 * A textarea gives no way to ask where the caret is on screen, so the popup
 * position is derived from the text itself. The font is monospace, which makes
 * one measured character width enough for an accurate column offset.
 */

let cachedWidth: number | null = null;
let cachedFont = "";

function charWidth(el: HTMLTextAreaElement): number {
  const style = window.getComputedStyle(el);
  const font = `${style.fontSize} ${style.fontFamily}`;
  if (cachedWidth !== null && cachedFont === font) return cachedWidth;

  const probe = document.createElement("span");
  probe.textContent = "0".repeat(40);
  probe.style.font = style.font;
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.whiteSpace = "pre";
  document.body.appendChild(probe);
  cachedWidth = probe.getBoundingClientRect().width / 40;
  cachedFont = font;
  probe.remove();

  return cachedWidth;
}

/** Pixel offset of the caret inside the textarea, relative to its own box. */
export function caretPosition(el: HTMLTextAreaElement, caret: number) {
  const style = window.getComputedStyle(el);
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
  const padTop = parseFloat(style.paddingTop) || 0;
  const padLeft = parseFloat(style.paddingLeft) || 0;

  const before = el.value.slice(0, caret);
  const lines = before.split("\n");
  const row = lines.length - 1;
  const column = lines[lines.length - 1].length;

  return {
    top: padTop + (row + 1) * lineHeight - el.scrollTop + 4,
    left: Math.min(padLeft + column * charWidth(el), el.clientWidth - 290),
  };
}
