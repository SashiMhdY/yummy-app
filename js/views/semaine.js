import { html, useState, useMemo } from '../vendor/htm-preact.js';
import { store } from '../store.js';
import { useStore, Plaque, Barre, Feuille, Compteur, Ico, naviguer, Image, Puce } from '../ui.js';
import { lundi, addDays, toISO, fromISO, semaineISO, plageSemaine, jourCourt, jourLong, aujourdhui, nombre, norm, uid, duree } from '../util.js';
import { parPart } from '../nutrition.js';

export const MOMENTS = [
  ['midi', 'Midi'],
  ['soir', 'Soir'],
];
const libMoment = (m) => (m === 'midi' ? 'midi' : 'soir');

export function Semaine({ q }) {
  const s = useStore();
  const debut = lundi(q.d ? fromISO(q.d) : new Date());
  const jours = [...Array(7)].map((_, i) => addDays(debut, i));
  const repas = s.local.planning.repas;
  const parId = useMemo(() => new Map(s.local.recettes.recettes.map((r) => [r.id, r])), [s.local.recettes]);
  const [ajout, setAjout] = useState(null); // { date, moment }
  const [edition, setEdition] = useState(null); // { date, moment, entree }
  const auj = aujourdhui();
  const allerA = (d) => naviguer(`#/semaine?d=${toISO(d)}`);
  const estCetteSemaine = toISO(lundi(new Date())) === toISO(debut);

  return html`<main class="vue">
    <${Barre} />
    <${Plaque} sous=${plageSemaine(debut)}>Semaine ${semaineISO(debut).num}<//>
    <div class="nav-semaine">
      <button class="btn-icone" onClick=${() => allerA(addDays(debut, -7))} aria-label="Semaine précédente">${Ico.gauche()}</button>
      <button class="btn-lien" onClick=${() => allerA(new Date())} disabled=${estCetteSemaine}>Cette semaine</button>
      <button class="btn-icone" onClick=${() => allerA(addDays(debut, 7))} aria-label="Semaine suivante">${Ico.droite()}</button>
    </div>

    <ol class="jours">
      ${jours.map((d) => {
        const iso = toISO(d);
        const j = repas[iso] || {};
        const kcal = MOMENTS.flatMap(([m]) => j[m] || [])
          .map((e) => e.r && parId.get(e.r))
          .filter(Boolean)
          .reduce((t, r) => t + parPart(r, s.aliments).kcal, 0);
        return html`<li class=${`jour${iso === auj ? ' jour-auj' : ''}${iso < auj ? ' jour-passe' : ''}`} key=${iso}>
          <div class="jour-date" aria-label=${`${jourLong(d)} ${d.getDate()}`}>
            <span class="jour-num">${d.getDate()}</span>
            <span class="jour-nom">${jourCourt(d)}</span>
          </div>
          <div class="jour-repas">
            ${MOMENTS.map(
              ([m, lib]) => html`<div class="creneau" key=${m}>
                <span class="creneau-lib">${lib}</span>
                <div class="creneau-liste">
                  ${(j[m] || []).map((e) => {
                    const r = e.r && parId.get(e.r);
                    return html`<button class="entree" key=${e.id} onClick=${() => setEdition({ date: iso, moment: m, entree: e })}>
                      ${r?.photo ? html`<span class="entree-vignette"><${Image} chemin=${r.photo.mini} /></span>` : html`<span class="entree-vignette entree-vignette-vide">${Ico.recettes()}</span>`}
                      <span class="entree-nom">${r ? r.nom : e.t || 'Recette supprimée'}</span>
                      ${r && html`<span class="parts">${e.p} ${e.p > 1 ? 'parts' : 'part'}</span>`}
                    </button>`;
                  })}
                  <button class=${(j[m] || []).length ? 'ajouter ajouter-discret' : 'ajouter'} onClick=${() => setAjout({ date: iso, moment: m })} aria-label=${`Ajouter un plat ${jourLong(d)} ${libMoment(m)}`}>
                    ${Ico.plus()}<span>${(j[m] || []).length ? 'Autre plat' : 'Ajouter'}</span>
                  </button>
                </div>
              </div>`,
            )}
            ${kcal > 0 && html`<p class="jour-kcal"><${Puce} k="kcal" petite /><span><strong>${nombre(kcal)} kcal</strong> par personne</span></p>`}
          </div>
        </li>`;
      })}
    </ol>

    ${ajout && html`<${ChoixRecette} ...${ajout} onFermer=${() => setAjout(null)} />`}
    ${edition && html`<${EditionEntree} ...${edition} recette=${parId.get(edition.entree.r)} onFermer=${() => setEdition(null)} />`}
  </main>`;
}

const titreCreneau = (date, moment) => {
  const d = fromISO(date);
  return `${jourLong(d)} ${d.getDate()}, ${libMoment(moment)}`;
};

export function ChoixRecette({ date, moment, onFermer }) {
  const s = useStore();
  const [q, setQ] = useState('');
  const [choisie, setChoisie] = useState(null);
  const [parts, setParts] = useState(4);
  const [libre, setLibre] = useState('');
  const liste = useMemo(() => {
    const n = norm(q);
    return s.local.recettes.recettes.filter((r) => !n || norm(r.nom).includes(n) || norm(r.type).includes(n));
  }, [q, s.local.recettes]);

  const choisir = (r) => {
    setChoisie(r);
    setParts(s.config.parts || r.portions || 4);
  };
  const valider = () => {
    store.faire('planning', 'repas.ajouter', { date, moment, entree: { id: uid(), r: choisie.id, p: parts } });
    store.afficher(`${choisie.nom} ajouté ${titreCreneau(date, moment)}`);
    onFermer();
  };
  const ajouterLibre = (e) => {
    e.preventDefault();
    if (!libre.trim()) return;
    store.faire('planning', 'repas.ajouter', { date, moment, entree: { id: uid(), t: libre.trim() } });
    onFermer();
  };

  if (choisie)
    return html`<${Feuille} titre=${titreCreneau(date, moment)} onFermer=${onFermer}>
      <p class="choix-nom">${choisie.nom}</p>
      <p class="aide">La recette est prévue pour ${choisie.portions} ${choisie.portions > 1 ? 'parts' : 'part'}.</p>
      <${Compteur} valeur=${parts} onChange=${setParts} label="Nombre de parts" />
      <div class="actions">
        <button class="btn" onClick=${valider}>Ajouter au menu</button>
        <button class="btn-lien" onClick=${() => setChoisie(null)}>Choisir une autre recette</button>
      </div>
    <//>`;

  return html`<${Feuille} titre=${titreCreneau(date, moment)} onFermer=${onFermer}>
    <label class="recherche">
      ${Ico.chercher()}
      <input type="search" placeholder="Chercher une recette" value=${q} onInput=${(e) => setQ(e.target.value)} autofocus aria-label="Chercher une recette" />
    </label>
    <ul class="liste-choix">
      ${liste.map(
        (r) => html`<li key=${r.id}>
          <button onClick=${() => choisir(r)}>
            <span class="liste-nom">${r.nom}</span>
            <span class="liste-meta">${r.type}${r.preparation + r.cuisson ? html`<span>${duree(r.preparation + r.cuisson)}</span>` : ''}</span>
          </button>
        </li>`,
      )}
      ${!liste.length && html`<li class="vide-petit">Aucune recette ne correspond.</li>`}
    </ul>
    <form class="libre" onSubmit=${ajouterLibre}>
      <label for="libre">Autre chose (restes, restaurant…)</label>
      <div class="ligne-champ">
        <input id="libre" value=${libre} onInput=${(e) => setLibre(e.target.value)} placeholder="Restes de la veille" />
        <button class="btn btn-second" type="submit">Noter</button>
      </div>
    </form>
  <//>`;
}

function EditionEntree({ date, moment, entree, recette, onFermer }) {
  const [parts, setParts] = useState(entree.p || 1);
  const changer = (p) => {
    setParts(p);
    store.faire('planning', 'repas.parts', { date, moment, id: entree.id, parts: p });
  };
  const retirer = () => {
    store.faire('planning', 'repas.retirer', { date, moment, id: entree.id });
    store.afficher('Retiré du menu');
    onFermer();
  };
  return html`<${Feuille} titre=${titreCreneau(date, moment)} onFermer=${onFermer}>
    <p class="choix-nom">${recette ? recette.nom : entree.t || 'Recette supprimée'}</p>
    ${recette && html`<${Compteur} valeur=${parts} onChange=${changer} label="Nombre de parts" />`}
    <div class="actions">
      ${recette && html`<a class="btn btn-second" href=${`#/recette/${recette.id}?p=${parts}`} onClick=${onFermer}>Voir la recette</a>`}
      <button class="btn-danger" onClick=${retirer}>Retirer du menu</button>
    </div>
  <//>`;
}
