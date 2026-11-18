import { html, render, useState, useEffect } from './vendor/htm-preact.js';
import { store } from './store.js';
import { useStore, Onglets, Toast, BanniereMaj } from './ui.js';
import { Semaine } from './views/semaine.js';
import { Courses } from './views/courses.js';
import { Recettes, Recette } from './views/recettes.js';
import { Edition } from './views/edition.js';
import { Reglages, Accueil } from './views/reglages.js';
import { Profils } from './views/profils.js';

function lireRoute() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [chemin, qs = ''] = h.split('?');
  const q = Object.fromEntries(new URLSearchParams(qs));
  const p = chemin.split('/').filter(Boolean);
  return { p, q };
}

function App() {
  const s = useStore();
  const [route, setRoute] = useState(lireRoute);
  useEffect(() => {
    const f = () => {
      setRoute(lireRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);

  if (!s.connecte) return html`<${Accueil} /><${Toast} />`;

  const { p, q } = route;
  let vue;
  let onglet = p[0] || localStorage.getItem('yummy.onglet') || 'semaine';
  if (onglet === 'recette' && p[2] === 'modifier') vue = html`<${Edition} key=${p[1]} id=${p[1]} />`;
  else if (onglet === 'recette') vue = html`<${Recette} key=${p[1]} id=${p[1]} q=${q} />`;
  else if (onglet === 'courses') vue = html`<${Courses} q=${q} />`;
  else if (onglet === 'recettes') vue = html`<${Recettes} />`;
  else if (onglet === 'reglages') vue = html`<${Reglages} />`;
  else if (onglet === 'profils') vue = html`<${Profils} />`;
  else {
    onglet = 'semaine';
    vue = html`<${Semaine} q=${q} />`;
  }
  const actif = onglet === 'recette' ? 'recettes' : onglet;
  if (['semaine', 'recettes', 'courses', 'profils'].includes(actif)) localStorage.setItem('yummy.onglet', actif);

  return html`
    <${BanniereMaj} />
    ${!s.charge && html`<p class="chargement" role="status">Chargement des données…</p>`}
    ${vue}
    <${Onglets} actif=${actif} />
    <${Toast} />
  `;
}

store.init();
render(html`<${App} />`, document.getElementById('app'));

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const avait = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg.update());
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => avait && store.signalerMaj());
}
