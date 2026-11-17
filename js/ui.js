// Composants partagés.
import { html, useState, useEffect, useRef } from './vendor/htm-preact.js';
import { store } from './store.js';

export function useStore() {
  const [, set] = useState(0);
  useEffect(() => store.abonner(() => set((x) => x + 1)), []);
  return store;
}

const svg = (d, extra = '') => html`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" dangerouslySetInnerHTML=${{ __html: d + extra }}></svg>`;

export const Ico = {
  semaine: () => svg('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  recettes: () => svg('<path d="M5 4.5h10.5a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10.5M9 8.5h6"/>'),
  courses: () => svg('<path d="M4 9h16l-1.6 9.2a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8z"/><path d="M8.5 9 11 4M15.5 9 13 4M9.5 13v3M14.5 13v3"/>'),
  reglages: () => svg('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  plus: () => svg('<path d="M12 5v14M5 12h14"/>'),
  moins: () => svg('<path d="M5 12h14"/>'),
  croix: () => svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  gauche: () => svg('<path d="M14.5 5.5 8 12l6.5 6.5"/>'),
  droite: () => svg('<path d="M9.5 5.5 16 12l-6.5 6.5"/>'),
  horloge: () => svg('<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>'),
  coche: () => svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  chercher: () => svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
};

export function Plaque({ children, sous, grande }) {
  return html`<header class="plaque-zone">
    <h1 class=${`plaque${grande ? ' plaque-grande' : ''}`}>${children}</h1>
    ${sous && html`<p class="plaque-sous">${sous}</p>`}
  </header>`;
}

export function EtatSync() {
  const s = useStore();
  const n = s.file.length;
  let txt = '';
  let cls = 'sync';
  if (s.sync.etat === 'envoi') txt = 'Envoi…';
  else if (s.sync.etat === 'attente') {
    txt = n ? `${n} en attente` : 'Hors ligne';
    cls += ' sync-attente';
  } else if (s.sync.etat === 'erreur') {
    txt = 'Synchro en échec';
    cls += ' sync-erreur';
  } else if (n) txt = 'Envoi…';
  if (!txt) return null;
  return html`<a class=${cls} href="#/reglages" title=${s.sync.message}>${txt}</a>`;
}

export function Barre({ retour, retourLabel = 'Retour', children }) {
  return html`<div class="barre">
    ${retour ? html`<a class="barre-retour" href=${retour}>${Ico.gauche()}<span>${retourLabel}</span></a>` : html`<span></span>`}
    <div class="barre-actions"><${EtatSync} />${children}</div>
  </div>`;
}

const ONGLETS = [
  ['semaine', 'Semaine', Ico.semaine],
  ['recettes', 'Recettes', Ico.recettes],
  ['courses', 'Courses', Ico.courses],
  ['reglages', 'Réglages', Ico.reglages],
];

export function Onglets({ actif }) {
  return html`<nav class="onglets" aria-label="Navigation principale">
    ${ONGLETS.map(
      ([id, label, ico]) => html`<a href=${`#/${id}`} class=${`onglet${actif === id ? ' actif' : ''}`} aria-current=${actif === id ? 'page' : undefined}>
        ${ico()}<span>${label}</span>
      </a>`,
    )}
  </nav>`;
}

export function Feuille({ titre, onFermer, children }) {
  const ref = useRef();
  useEffect(() => {
    const prec = document.activeElement;
    const k = (e) => e.key === 'Escape' && onFermer();
    document.addEventListener('keydown', k);
    document.body.classList.add('fige');
    const f = ref.current?.querySelector('[autofocus], input, button, a');
    f?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', k);
      document.body.classList.remove('fige');
      prec?.focus?.({ preventScroll: true });
    };
  }, []);
  return html`<div class="voile" onClick=${(e) => e.target === e.currentTarget && onFermer()}>
    <div class="feuille" role="dialog" aria-modal="true" aria-label=${titre} ref=${ref}>
      <div class="feuille-tete">
        <h2>${titre}</h2>
        <button class="btn-icone" onClick=${onFermer} aria-label="Fermer">${Ico.croix()}</button>
      </div>
      <div class="feuille-corps">${children}</div>
    </div>
  </div>`;
}

export function Compteur({ valeur, onChange, min = 1, max = 99, label }) {
  return html`<div class="compteur" role="group" aria-label=${label}>
    <button class="btn-icone" onClick=${() => onChange(Math.max(min, valeur - 1))} disabled=${valeur <= min} aria-label="Une part de moins">${Ico.moins()}</button>
    <output aria-live="polite"><strong>${valeur}</strong> ${valeur > 1 ? 'parts' : 'part'}</output>
    <button class="btn-icone" onClick=${() => onChange(Math.min(max, valeur + 1))} disabled=${valeur >= max} aria-label="Une part de plus">${Ico.plus()}</button>
  </div>`;
}

export function Toast() {
  const s = useStore();
  if (!s.toast) return null;
  return html`<div class="toast" role="status" key=${s.toast.id}>${s.toast.message}</div>`;
}

export function BanniereMaj() {
  const s = useStore();
  if (!s.majDisponible) return null;
  return html`<button class="banniere-maj" onClick=${() => location.reload()}>Nouvelle version disponible. Recharger</button>`;
}

export const naviguer = (h) => {
  location.hash = h;
};
