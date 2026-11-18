import { html, useState, useMemo } from '../vendor/htm-preact.js';
import { store } from '../store.js';
import { useStore, Plaque, Barre, Feuille, Compteur, Ico, naviguer } from '../ui.js';
import { norm, duree, nombre, quantite, lundi, addDays, toISO, jourCourt, uid, jourLong } from '../util.js';
import { parPart } from '../nutrition.js';
import { md } from '../md.js';
import { usePhoto, envoyerPhoto } from '../photos.js';
import { MOMENTS } from './semaine.js';

const LS_FILTRE = 'yummy.filtreType';

// ---------- Photos ----------
function Image({ chemin, alt = '', classe = '' }) {
  const { url, echec } = usePhoto(chemin);
  return html`<span class=${`image ${classe}${url ? ' prete' : ''}`}>
    ${url ? html`<img src=${url} alt=${alt} decoding="async" />` : echec ? html`<span class="image-echec">Photo indisponible</span>` : null}
  </span>`;
}

function BoutonPhoto({ recette, classe, label, children }) {
  const [envoi, setEnvoi] = useState(false);
  const choisir = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setEnvoi(true);
    try {
      await envoyerPhoto(recette, f);
      store.afficher('Photo ajoutée');
    } catch (err) {
      store.afficher(err.message || 'La photo n’a pas pu être envoyée.');
    } finally {
      setEnvoi(false);
    }
  };
  return html`<label class=${`${classe}${envoi ? ' envoi' : ''}`} title=${label}>
    <input type="file" accept="image/*" class="masque" onChange=${choisir} disabled=${envoi} aria-label=${label} />
    ${envoi ? html`<span class="envoi-texte">Envoi…</span>` : children}
  </label>`;
}

// ---------- Liste ----------
export function Recettes() {
  const s = useStore();
  const [q, setQ] = useState('');
  const [type, setType] = useState(() => localStorage.getItem(LS_FILTRE) || '');
  const recettes = s.local.recettes.recettes;
  const types = useMemo(() => [...new Set(recettes.map((r) => r.type).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')), [recettes]);
  const liste = useMemo(() => {
    const n = norm(q);
    return recettes.filter((r) => {
      if (type && r.type !== type) return false;
      if (!n) return true;
      const foin = norm([r.nom, r.type, ...(r.etiquettes || []), ...(r.sources || []), ...r.ingredients.map((i) => i.nom)].join(' '));
      return n.split(/\s+/).every((m) => foin.includes(m));
    });
  }, [q, type, recettes]);
  const choisirType = (t) => {
    const v = t === type ? '' : t;
    localStorage.setItem(LS_FILTRE, v);
    setType(v);
  };

  return html`<main class="vue">
    <${Barre} />
    <${Plaque} sous=${`${recettes.length} recettes dans le livre`}>Recettes<//>
    <label class="recherche">
      ${Ico.chercher()}
      <input type="search" placeholder="Nom, ingrédient, étiquette" value=${q} onInput=${(e) => setQ(e.target.value)} aria-label="Chercher une recette" />
    </label>
    <div class="filtres" role="group" aria-label="Filtrer par type de plat">
      ${types.map((t) => html`<button class=${`filtre${type === t ? ' actif' : ''}`} aria-pressed=${type === t} onClick=${() => choisirType(t)}>${t}</button>`)}
    </div>
    <ul class="liste-recettes">
      ${liste.map((r) => {
        const pp = parPart(r, s.aliments);
        return html`<li key=${r.id} class="ligne-recette">
          ${r.photo
            ? html`<a href=${`#/recette/${r.id}`} class="vignette" tabindex="-1" aria-hidden="true"><${Image} chemin=${r.photo.mini} /></a>`
            : html`<${BoutonPhoto} recette=${r} classe="vignette vignette-vide" label=${`Ajouter une photo de ${r.nom}`}>${Ico.plus()}<//>`}
          <a href=${`#/recette/${r.id}`} class="ligne-texte">
            <span class="liste-nom">${r.nom}</span>
            <span class="liste-meta">
              <span>${r.type}</span>
              ${r.preparation + r.cuisson > 0 && html`<span class="avec-ico">${Ico.horloge()}${duree(r.preparation + r.cuisson)}</span>`}
              ${pp.kcal > 0 && html`<span>${nombre(pp.kcal)} kcal par part</span>`}
            </span>
          </a>
        </li>`;
      })}
    </ul>
    ${!liste.length &&
    html`<div class="vide">
      ${recettes.length ? html`<p>Aucune recette ne correspond à cette recherche.</p>` : html`<p>Le livre est vide.</p><p>Les recettes s’ajoutent en envoyant la photo d’une recette à Claude.</p>`}
    </div>`}
  </main>`;
}

// ---------- Fiche ----------
export function Recette({ id, q }) {
  const s = useStore();
  const r = s.local.recettes.recettes.find((x) => x.id === id);
  const [parts, setParts] = useState(() => Number(q.p) || r?.portions || 4);
  const [planifier, setPlanifier] = useState(false);
  if (!r)
    return html`<main class="vue">
      <${Barre} retour="#/recettes" retourLabel="Recettes" />
      <div class="vide"><p>Cette recette n’existe plus.</p></div>
    </main>`;

  const f = parts / Math.max(1, r.portions);
  const pp = parPart(r, s.aliments);
  const supprimer = () => {
    if (!confirm(`Supprimer « ${r.nom} » du livre de recettes ?`)) return;
    store.faire('recettes', 'recette.supprimer', { id: r.id });
    store.afficher('Recette supprimée');
    naviguer('#/recettes');
  };

  return html`<main class="vue vue-recette">
    <${Barre} retour="#/recettes" retourLabel="Recettes">
      <a class="btn btn-petit btn-second" href=${`#/recette/${r.id}/modifier`}>Modifier</a>
    <//>
    ${r.photo
      ? html`<figure class="photo-plat">
          <${Image} chemin=${r.photo.grande} alt=${`Photo du plat : ${r.nom}`} />
          <${BoutonPhoto} recette=${r} classe="photo-changer" label="Changer la photo">${Ico.photo()}<//>
        </figure>`
      : html`<${BoutonPhoto} recette=${r} classe="photo-vide" label="Ajouter une photo du plat">${Ico.plus()}<span>Ajouter une photo du plat</span><//>`}
    <div class=${r.photo ? 'tete-sur-photo' : ''}>
      <${Plaque} sous=${[r.type, ...(r.sources || [])].filter(Boolean).join(', ')}>${r.nom}<//>
    </div>

    <dl class="faits">
      ${r.preparation > 0 && html`<div><dt>Préparation</dt><dd>${duree(r.preparation)}</dd></div>`}
      <div><dt>Cuisson</dt><dd>${r.cuisson ? duree(r.cuisson) : 'aucune'}</dd></div>
      ${r.difficulte && html`<div><dt>Difficulté</dt><dd>${r.difficulte}</dd></div>`}
    </dl>

    <section class="bloc">
      <h2>Par part</h2>
      <table class="macros">
        <tbody><tr>
          <td><strong>${nombre(pp.kcal)}</strong> kcal</td>
          <td><strong>${nombre(pp.proteines)} g</strong> protéines</td>
          <td><strong>${nombre(pp.glucides)} g</strong> glucides</td>
          <td><strong>${nombre(pp.lipides)} g</strong> lipides</td>
        </tr></tbody>
      </table>
      ${pp.manquants.length > 0 && html`<p class="aide">Sans valeur nutritionnelle : ${pp.manquants.join(', ')}.</p>`}
    </section>

    <button class="btn btn-large" onClick=${() => setPlanifier(true)}>${Ico.semaine()}<span>Planifier ce plat</span></button>

    <section class="bloc">
      <div class="bloc-tete">
        <h2>Ingrédients</h2>
        <${Compteur} valeur=${parts} onChange=${setParts} label="Nombre de parts" />
      </div>
      <ul class="ingredients">
        ${r.ingredients.map(
          (i, k) => html`<li key=${k}>
            <span>${i.nom}</span>
            <span class="ing-qte">${quantite(i.quantite != null ? i.quantite * f : null, i.unite)}</span>
          </li>`,
        )}
      </ul>
      ${r.allergenes && html`<p class="aide">Allergènes : ${r.allergenes}</p>`}
    </section>

    ${r.intro && html`<section class="bloc texte" dangerouslySetInnerHTML=${{ __html: md(r.intro) }}></section>`}

    ${r.etapes &&
    html`<section class="bloc texte">
      <h2>Préparation</h2>
      <div dangerouslySetInnerHTML=${{ __html: md(r.etapes) }}></div>
    </section>`}

    ${r.ingredients_texte &&
    html`<details class="bloc texte origine">
      <summary>Liste d’ingrédients d’origine (pour ${r.portions} ${r.portions > 1 ? 'parts' : 'part'})</summary>
      <div dangerouslySetInnerHTML=${{ __html: md(r.ingredients_texte) }}></div>
    </details>`}

    ${r.url && html`<p class="aide"><a href=${r.url} target="_blank" rel="noopener">Recette en ligne</a></p>`}
    <p class="centre"><button class="btn-danger" onClick=${supprimer}>Supprimer la recette</button></p>

    ${planifier && html`<${Planifier} recette=${r} partsInit=${parts} onFermer=${() => setPlanifier(false)} />`}
  </main>`;
}

function Planifier({ recette, partsInit, onFermer }) {
  const s = useStore();
  const [semaine, setSemaine] = useState(0);
  const debut = addDays(lundi(new Date()), semaine * 7);
  const auj = toISO(new Date());
  const [date, setDate] = useState(auj);
  const [moment, setMoment] = useState(new Date().getHours() < 14 ? 'midi' : 'soir');
  const [parts, setParts] = useState(s.config.parts || partsInit);
  const valider = () => {
    store.faire('planning', 'repas.ajouter', { date, moment, entree: { id: uid(), r: recette.id, p: parts } });
    const d = new Date(date + 'T12:00');
    store.afficher(`Prévu ${jourLong(d)} ${d.getDate()}, ${moment}`);
    onFermer();
  };
  return html`<${Feuille} titre="Planifier ce plat" onFermer=${onFermer}>
    <p class="choix-nom">${recette.nom}</p>
    <div class="segments" role="group" aria-label="Semaine">
      <button aria-pressed=${semaine === 0} onClick=${() => setSemaine(0)}>Cette semaine</button>
      <button aria-pressed=${semaine === 1} onClick=${() => setSemaine(1)}>La suivante</button>
    </div>
    <div class="jours-choix" role="group" aria-label="Jour">
      ${[...Array(7)].map((_, i) => {
        const d = addDays(debut, i);
        const iso = toISO(d);
        return html`<button key=${iso} aria-pressed=${date === iso} disabled=${iso < auj} onClick=${() => setDate(iso)}>
          <span>${jourCourt(d)}</span><strong>${d.getDate()}</strong>
        </button>`;
      })}
    </div>
    <div class="segments" role="group" aria-label="Repas">
      ${MOMENTS.map(([m, lib]) => html`<button aria-pressed=${moment === m} onClick=${() => setMoment(m)}>${lib}</button>`)}
    </div>
    <${Compteur} valeur=${parts} onChange=${setParts} label="Nombre de parts" />
    <div class="actions">
      <button class="btn" onClick=${valider} disabled=${date < auj}>Ajouter au menu</button>
    </div>
  <//>`;
}
