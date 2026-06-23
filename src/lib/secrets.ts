/**
 * Retire les blocs secrets (<div data-type="secret">…</div>) d'un contenu HTML.
 * Gère l'imbrication de <div> (callouts à l'intérieur d'un secret, etc.) en
 * suivant la profondeur des balises div, afin de couper exactement au bon endroit.
 *
 * Utilisé pour masquer le contenu MJ-only aux narrateurs (NARRA).
 */
export function stripSecretBlocks(html: string): string {
  if (!html.includes('data-type="secret"')) return html;

  const marker = '<div data-type="secret"';
  let result = "";
  let i = 0;

  while (i < html.length) {
    const start = html.indexOf(marker, i);
    if (start === -1) {
      result += html.slice(i);
      break;
    }
    result += html.slice(i, start);

    // Avance jusqu'au </div> qui ferme ce bloc, en équilibrant les <div> imbriqués.
    let depth = 0;
    let j = start;
    while (j < html.length) {
      const nextOpen = html.indexOf("<div", j);
      const nextClose = html.indexOf("</div>", j);
      if (nextClose === -1) {
        j = html.length;
        break;
      }
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        j = nextOpen + 4;
      } else {
        depth--;
        j = nextClose + 6;
        if (depth === 0) break;
      }
    }
    i = j;
  }

  return result;
}
