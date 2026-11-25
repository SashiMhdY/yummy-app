// Composants partagés.
import { html, useState, useEffect, useRef } from './vendor/htm-preact.js';
import { store } from './store.js';
import { usePhoto } from './photos.js';
import { nombre } from './util.js';

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
  profils: () => svg('<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.5 14.6a4.5 4.5 0 0 1 5 4.9"/>'),
  etoile: () => svg('<path d="M12 3.6l2.55 5.17 5.7.83-4.13 4.02.98 5.68L12 16.6l-5.1 2.7.98-5.68L3.75 9.6l5.7-.83z"/>'),
  etoilePleine: () => svg('<path fill="currentColor" d="M12 3.6l2.55 5.17 5.7.83-4.13 4.02.98 5.68L12 16.6l-5.1 2.7.98-5.68L3.75 9.6l5.7-.83z"/>'),
  photo: () => svg('<path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10H4z"/><circle cx="12" cy="13.2" r="3.3"/>'),
  // pictos des macros
  flamme: () => svg('<path d="M12 21c-3.7 0-6.2-2.5-6.2-5.9 0-2.7 1.5-4.5 3-6.1.2 1.7.9 2.8 2 3.3-.3-3.5 1.3-6.4 3.8-8.3.2 2.7 1.4 4.4 2.7 5.9 1.2 1.4 1.9 2.9 1.9 5.2 0 3.4-3.5 5.9-7.2 5.9z"/><path d="M12 21c-1.6 0-2.7-1.1-2.7-2.6 0-1.4 1-2.4 2.2-3.4.2.9.7 1.5 1.4 1.7.2-.9.7-1.6 1.3-2.1.4.9.6 1.6.6 2.6 0 2.2-1.2 3.8-2.8 3.8z"/>'),
  oeuf: () => svg('<path d="M12 3.5c3.4 0 6.2 5.3 6.2 9.6a6.2 6.2 0 0 1-12.4 0c0-4.3 2.8-9.6 6.2-9.6z"/><circle cx="12" cy="14" r="2.6"/>'),
  epi: () => svg('<path d="M12 21.5V8.5"/><path d="M12 8.5C10 8.2 8.9 6.7 8.9 4.6c2 .3 3.1 1.8 3.1 3.9zm0 0c2-.3 3.1-1.8 3.1-3.9-2 .3-3.1 1.8-3.1 3.9zM12 13c-2.1-.2-3.4-1.7-3.4-3.8 2.1.2 3.4 1.7 3.4 3.8zm0 0c2.1-.2 3.4-1.7 3.4-3.8-2.1.2-3.4 1.7-3.4 3.8zm0 4.5c-2.1-.2-3.4-1.7-3.4-3.8 2.1.2 3.4 1.7 3.4 3.8zm0 0c2.1-.2 3.4-1.7 3.4-3.8-2.1.2-3.4 1.7-3.4 3.8z"/>'),
  goutte: () => svg('<path d="M12 3.2s6.2 6.6 6.2 11.2a6.2 6.2 0 0 1-12.4 0C5.8 9.8 12 3.2 12 3.2z"/><path d="M9.1 14.6a3 3 0 0 0 2.5 2.8"/>'),
  feuille: () => svg('<path d="M5 19.5C5 11 10 5.4 19.5 4.5c0 9.4-5.4 15-13.5 15z"/><path d="M5 19.5 13.5 11"/>'),
  toque: () => svg('<path d="M7 14.5a4 4 0 0 1-.6-7.9 5.6 5.6 0 0 1 11.2 0A4 4 0 0 1 17 14.5V19H7z"/><path d="M7 16.5h10"/>'),
};

// Pictos des rayons de la liste de courses.
export const IcoRayon = {
  'fruits-legumes': () => svg('<path d="M14.5 9.5 6 18a1.6 1.6 0 0 1-2.2-2.2l8.5-8.5a2.6 2.6 0 0 1 3.6 0 2.6 2.6 0 0 1 0 3.6z"/><path d="M15.5 8.5c.4-2 1.6-3.6 3.5-4.3M15.5 8.5c2-.3 3.6.3 4.8 1.6M15.5 8.5c-.5-1.7-.1-3.4 1-4.6M9 13l1.6 1.6M11.6 10.4l1.2 1.2"/>'),
  boulangerie: () => svg('<path d="M5.5 18.5c-2-2-1.4-6 1.7-9.1s7.1-3.7 9.1-1.7l1.2 1.2c2 2 1.4 6-1.7 9.1s-7.1 3.7-9.1 1.7z"/><path d="M9 11.5l2 2M11.5 9l2 2M12 14.5l1.8 1.8M14.5 12l1.8 1.8"/>'),
  boucherie: () => svg('<path d="M3.5 12c2.4-3.4 5.6-5 9-5 3 0 5.3 1.4 6.6 3.3L21 8v8l-1.9-2.3C17.8 15.6 15.5 17 12.5 17c-3.4 0-6.6-1.6-9-5z"/><circle cx="8" cy="11" r=".6" fill="currentColor"/>'),
  charcuterie: () => svg('<path d="M5 6.5c3.5 0 8 2 10.5 5S19 18 19 18c-1 .9-2.5 1.2-4 .6-3.5-1.4-6.4-4.6-8.3-8-.7-1.3-.8-2.8-1.7-4.1z"/><path d="M19 18l1.5 1.5M5 6.5 3.5 5M10 11h.01M13 14h.01"/>'),
  frais: () => svg('<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5"/>'),
  cremerie: () => svg('<path d="M9 3.5h6M9.5 3.5v3L7 10v10.5h10V10l-2.5-3.5v-3"/><path d="M7 13.5h10"/>'),
  fromages: () => svg('<path d="M3.5 15.5 14 6.5l6.5 5v6.5h-17z"/><path d="M3.5 15.5h17"/><circle cx="9" cy="18" r="1"/><circle cx="15.5" cy="13.2" r="1"/>'),
  epicerie: () => svg('<path d="M8 3.5h8v3H8z"/><path d="M7.5 6.5h9a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V8a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M6 11h12v5H6z"/>'),
  'epicerie-sucree': () => svg('<circle cx="12" cy="12" r="8"/><path d="M9 9h.01M14.5 8.5h.01M9.5 14.5h.01M15 14h.01M12 11.5h.01"/>'),
  boissons: () => svg('<path d="M6.5 4h11l-1.5 16h-8z"/><path d="M7.2 10h9.6"/>'),
  placard: () => svg('<path d="M8 9.5a4 4 0 0 1 8 0V20H8z"/><path d="M9.5 4.5h5v1.5h-5z"/><path d="M11 12h.01M13 12h.01M12 14h.01"/>'),
  autres: () => svg('<path d="M5.5 8h13l-1 12h-11z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>'),
  ajouts: () => svg('<path d="M12 5v14M5 12h14"/>'),
};

export function PuceRayon({ id }) {
  return html`<span class=${`puce r-${id}`} aria-hidden="true">${(IcoRayon[id] || IcoRayon.autres)()}</span>`;
}

// Les macros : clé, libellé, unité, picto. Chaque macro a sa couleur (classe .m-<clé>).
export const MACROS = [
  ['kcal', 'Énergie', 'kcal', Ico.flamme],
  ['proteines', 'Protéines', 'g', Ico.oeuf],
  ['glucides', 'Glucides', 'g', Ico.epi],
  ['lipides', 'Lipides', 'g', Ico.goutte],
  ['fibres', 'Fibres', 'g', Ico.feuille],
];
const MACRO = Object.fromEntries(MACROS.map((m) => [m[0], m]));

// Pastille ronde colorée avec le picto d'une macro.
export function Puce({ k, petite }) {
  return html`<span class=${`puce m-${k}${petite ? ' puce-petite' : ''}`} aria-hidden="true">${MACRO[k][3]()}</span>`;
}

// Ligne compacte de macros (listes) : picto + valeur.
export function MiniMacros({ pp, cles = ['kcal', 'proteines', 'glucides', 'lipides'] }) {
  return html`<span class="mini-macros">
    ${cles.map((k) => {
      const [, lib, u] = MACRO[k];
      return html`<span class=${`mini-macro m-${k}`} title=${lib}><${Puce} k=${k} petite />${nombre(pp[k])}${k === 'kcal' ? '' : '\u202Fg'}<span class="masque">${k === 'kcal' ? ' kcal' : ` de ${lib.toLowerCase()}`}</span></span>`;
    })}
  </span>`;
}

// Repère d'énergie par part, façon pastille de couleur.
export function niveauKcal(kcal) {
  if (!(kcal > 0)) return null;
  if (kcal < 450) return ['leger', 'Léger'];
  if (kcal < 750) return ['moyen', 'Modéré'];
  return ['copieux', 'Copieux'];
}

export function Image({ chemin, alt = '', classe = '' }) {
  const { url, echec } = usePhoto(chemin);
  return html`<span class=${`image ${classe}${url ? ' prete' : ''}`}>
    ${url ? html`<img src=${url} alt=${alt} decoding="async" />` : echec ? html`<span class="image-echec">Photo indisponible</span>` : null}
  </span>`;
}

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
  ['profils', 'Profils', Ico.profils],
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
