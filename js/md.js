// Petit rendu Markdown (titres, listes, encadrés, gras, italique, liens).
// Le texte est échappé avant toute mise en forme.

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(s) {
  let t = esc(s);
  t = t.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, (_, x) => x.split('/').pop());
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  t = t.replace(/(^|\s)_([^_]+)_/g, '$1<em>$2</em>');
  return t;
}

export function md(src) {
  if (!src) return '';
  const lines = src.replace(/\r/g, '').split('\n');
  const out = [];
  let list = null; // 'ul' | 'ol'
  let para = [];
  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const s = l.trim();
    if (!s) {
      flushPara();
      closeList();
      continue;
    }
    // Encadré Obsidian : > [!note] emoji
    const co = s.match(/^>\s*\[!(\w+)\]-?\s*(.*)$/);
    if (co) {
      flushPara();
      closeList();
      const body = [];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
        body.push(lines[++i].trim().replace(/^>\s?/, ''));
      }
      const titre = co[2] ? `<span class="callout-marque" aria-hidden="true">${esc(co[2])}</span>` : '';
      out.push(`<aside class="callout">${titre}<div>${md(body.join('\n'))}</div></aside>`);
      continue;
    }
    if (s.startsWith('>')) {
      flushPara();
      closeList();
      const body = [s.replace(/^>\s?/, '')];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) body.push(lines[++i].trim().replace(/^>\s?/, ''));
      out.push(`<blockquote>${md(body.join('\n'))}</blockquote>`);
      continue;
    }
    const h = s.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      closeList();
      const n = Math.min(6, h[1].length + 1);
      out.push(`<h${n}>${inline(h[2])}</h${n}>`);
      continue;
    }
    const ol = s.match(/^(\d+)[.)]\s+(.*)$/);
    const ul = s.match(/^[-*•]\s+(.*)$/);
    if (ol || ul) {
      flushPara();
      const kind = ol ? 'ol' : 'ul';
      if (list !== kind) {
        closeList();
        list = kind;
        out.push(ol && ol[1] !== '1' ? `<ol start="${Number(ol[1])}">` : `<${kind}>`);
      }
      out.push(`<li>${inline(ol ? ol[2] : ul[1])}</li>`);
      continue;
    }
    if (list && /^\s{2,}/.test(l)) {
      // suite d'un élément de liste
      out[out.length - 1] = out[out.length - 1].replace(/<\/li>$/, ` ${inline(s)}</li>`);
      continue;
    }
    closeList();
    para.push(s);
  }
  flushPara();
  closeList();
  return out.join('\n');
}
