import { html, useState, useMemo } from '../vendor/htm-preact.js';
import { store } from '../store.js';
import { useStore, Plaque, Barre, Ico, naviguer } from '../ui.js';
import { norm, slug, nombre, aujourdhui } from '../util.js';
import { parPart } from '../nutrition.js';

const UNITES = ['g', 'ml', 'pièce', 'c. à s.', 'c. à c.'];
const DIFFICULTES = ['', 'Facile', 'Moyenne', 'Difficile'];
const TYPES_BASE = ['Plat', 'Entrée', 'Apéro', 'Dessert', 'Boulangerie', 'Sauce & base'];

const vide = () => ({
  id: '',
  nom: '',
  type: 'Plat',
  etiquettes: [],
  sources: [],
  url: '',
  portions: 4,
  preparation: 0,
  cuisson: 0,
  difficulte: '',
  allergenes: '',
  ingredients: [],
  intro: '',
  ingredients_texte: '',
  etapes: '',
});

// Poids d'une pièce déjà connu dans le livre pour un aliment donné.
function poidsUnitaires(recettes) {
  const m = new Map();
  for (const r of recettes)
    for (const i of r.ingredients)
      if (i.unite === 'pièce' && i.aliment && i.quantite && i.poids && !m.has(i.aliment)) m.set(i.aliment, i.poids / i.quantite);
  return m;
}

function poidsAuto(l, unitaires) {
  const q = Number(l.quantite);
  if (!q) return null;
  if (l.unite === 'g' || l.unite === 'ml') return q;
  if (l.unite === 'c. à s.') return q * 15;
  if (l.unite === 'c. à c.') return q * 5;
  if (l.unite === 'pièce' && l.aliment && unitaires.has(l.aliment)) return Math.round(q * unitaires.get(l.aliment));
  return null;
}

export function Edition({ id }) {
  const s = useStore();
  const existante = id && s.local.recettes.recettes.find((r) => r.id === id);
  const [f, setF] = useState(() => {
    const base = existante ? JSON.parse(JSON.stringify(existante)) : vide();
    base.ingredients = base.ingredients.map((i) => ({ ...i, _cle: Math.random(), _poidsManuel: true }));
    base._etiquettes = (base.etiquettes || []).join(', ');
    base._source = (base.sources || []).join(', ');
    return base;
  });
  const [erreurs, setErreurs] = useState([]);
  const unitaires = useMemo(() => poidsUnitaires(s.local.recettes.recettes), [s.local.recettes]);
  const types = useMemo(() => [...new Set([...TYPES_BASE, ...s.local.recettes.recettes.map((r) => r.type).filter(Boolean)])], [s.local.recettes]);

  const maj = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const majIng = (cle, patch) =>
    setF((x) => ({
      ...x,
      ingredients: x.ingredients.map((i) => {
        if (i._cle !== cle) return i;
        const n = { ...i, ...patch };
        if ('poids' in patch) n._poidsManuel = patch.poids !== '' && patch.poids != null;
        if (!n._poidsManuel) n.poids = poidsAuto(n, unitaires);
        return n;
      }),
    }));
  const ajouterIng = () => setF((x) => ({ ...x, ingredients: [...x.ingredients, { _cle: Math.random(), nom: '', quantite: '', unite: 'g', poids: null, aliment: null, _poidsManuel: false }] }));
  const retirerIng = (cle) => setF((x) => ({ ...x, ingredients: x.ingredients.filter((i) => i._cle !== cle) }));

  const propre = () => {
    const r = { ...f };
    r.nom = r.nom.trim();
    r.portions = Math.max(1, Number(r.portions) || 1);
    r.preparation = Number(r.preparation) || 0;
    r.cuisson = Number(r.cuisson) || 0;
    r.etiquettes = f._etiquettes.split(',').map((x) => x.trim()).filter(Boolean);
    r.sources = f._source.split(',').map((x) => x.trim()).filter(Boolean);
    r.ingredients = f.ingredients
      .filter((i) => i.nom.trim())
      .map((i) => ({
        nom: i.nom.trim(),
        quantite: i.quantite === '' || i.quantite == null ? null : Number(i.quantite),
        unite: i.unite,
        poids: i.poids === '' || i.poids == null ? null : Number(i.poids),
        aliment: i.aliment || null,
      }));
    delete r._etiquettes;
    delete r._source;
    return r;
  };
  const apercu = parPart(propre(), s.aliments);

  const enregistrer = (e) => {
    e.preventDefault();
    const r = propre();
    const err = [];
    if (!r.nom) err.push('Donne un nom à la recette.');
    if (!r.ingredients.length) err.push('Ajoute au moins un ingrédient.');
    setErreurs(err);
    if (err.length) return;
    if (!existante) {
      let base = slug(r.nom) || 'recette';
      let nid = base;
      for (let k = 2; s.local.recettes.recettes.some((x) => x.id === nid); k++) nid = `${base}-${k}`;
      r.id = nid;
      r.ajoutee_le = aujourdhui();
    } else r.modifiee_le = aujourdhui();
    store.faire('recettes', 'recette.enregistrer', { recette: r });
    store.afficher('Recette enregistrée');
    naviguer(`#/recette/${r.id}`);
  };

  return html`<main class="vue">
    <${Barre} retour=${existante ? `#/recette/${existante.id}` : '#/recettes'} retourLabel="Annuler" />
    <${Plaque}>${existante ? 'Modifier la recette' : 'Nouvelle recette'}<//>
    <form class="formulaire" onSubmit=${enregistrer} novalidate>
      <label class="champ">
        <span>Nom</span>
        <input value=${f.nom} onInput=${(e) => maj('nom', e.target.value)} required />
      </label>
      <div class="grille-2">
        <label class="champ">
          <span>Type de plat</span>
          <select value=${f.type} onChange=${(e) => maj('type', e.target.value)}>
            ${types.map((t) => html`<option value=${t}>${t}</option>`)}
          </select>
        </label>
        <label class="champ">
          <span>Parts</span>
          <input type="number" inputmode="numeric" min="1" value=${f.portions} onInput=${(e) => maj('portions', e.target.value)} />
        </label>
        <label class="champ">
          <span>Préparation (min)</span>
          <input type="number" inputmode="numeric" min="0" value=${f.preparation} onInput=${(e) => maj('preparation', e.target.value)} />
        </label>
        <label class="champ">
          <span>Cuisson (min)</span>
          <input type="number" inputmode="numeric" min="0" value=${f.cuisson} onInput=${(e) => maj('cuisson', e.target.value)} />
        </label>
        <label class="champ">
          <span>Difficulté</span>
          <select value=${f.difficulte} onChange=${(e) => maj('difficulte', e.target.value)}>
            ${DIFFICULTES.map((d) => html`<option value=${d}>${d || 'Non précisée'}</option>`)}
          </select>
        </label>
        <label class="champ">
          <span>Source</span>
          <input value=${f._source} onInput=${(e) => maj('_source', e.target.value)} placeholder="Livre, site…" />
        </label>
      </div>
      <label class="champ">
        <span>Étiquettes, séparées par des virgules</span>
        <input value=${f._etiquettes} onInput=${(e) => maj('_etiquettes', e.target.value)} placeholder="salé, végétarien" />
      </label>

      <fieldset class="bloc">
        <legend>Ingrédients</legend>
        <p class="aide">Le poids sert au calcul des calories. Il se remplit seul pour les grammes, millilitres et cuillères ; indique-le pour les pièces si besoin.</p>
        ${f.ingredients.map((i) => html`<${LigneIngredient} key=${i._cle} i=${i} maj=${(p) => majIng(i._cle, p)} retirer=${() => retirerIng(i._cle)} aliments=${s.aliments} />`)}
        <button type="button" class="btn btn-second" onClick=${ajouterIng}>${Ico.plus()}<span>Ajouter un ingrédient</span></button>
      </fieldset>

      <label class="champ">
        <span>Étapes</span>
        <textarea rows="8" value=${f.etapes} onInput=${(e) => maj('etapes', e.target.value)} placeholder=${'1. Préchauffer le four…\n2. …'}></textarea>
      </label>
      <label class="champ">
        <span>Présentation ou conseils (facultatif)</span>
        <textarea rows="3" value=${f.intro} onInput=${(e) => maj('intro', e.target.value)}></textarea>
      </label>
      <label class="champ">
        <span>Allergènes (facultatif)</span>
        <input value=${f.allergenes} onInput=${(e) => maj('allergenes', e.target.value)} />
      </label>

      <div class="apercu" aria-live="polite">
        <div><strong>${nombre(apercu.kcal)} kcal</strong>par part</div>
        <span>${nombre(apercu.proteines)} g de protéines, ${nombre(apercu.glucides)} g de glucides, ${nombre(apercu.lipides)} g de lipides</span>
      </div>
      ${erreurs.length > 0 && html`<ul class="erreurs" role="alert">${erreurs.map((x) => html`<li>${x}</li>`)}</ul>`}
      <div class="actions">
        <button class="btn btn-large" type="submit">Enregistrer la recette</button>
      </div>
    </form>
  </main>`;
}

function LigneIngredient({ i, maj, retirer, aliments }) {
  const [cherche, setCherche] = useState(false);
  const [q, setQ] = useState('');
  const sugg = useMemo(() => {
    if (!cherche) return [];
    const mots = norm(q || i.nom).split(/\s+/).filter(Boolean);
    if (!mots.length) return [];
    return Object.keys(aliments)
      .map((n) => [n, norm(n)])
      .filter(([, nn]) => mots.every((m) => nn.includes(m)))
      .sort((a, b) => a[1].indexOf(mots[0]) - b[1].indexOf(mots[0]) || a[0].length - b[0].length)
      .slice(0, 8)
      .map(([n]) => n);
  }, [cherche, q, i.nom, aliments]);

  return html`<div class="ing-edit">
    <div class="ing-ligne">
      <input class="ing-nom" aria-label="Ingrédient" placeholder="Ingrédient" value=${i.nom} onInput=${(e) => maj({ nom: e.target.value })} />
      <button type="button" class="btn-icone" onClick=${retirer} aria-label=${`Retirer ${i.nom || 'cet ingrédient'}`}>${Ico.croix()}</button>
    </div>
    <div class="ing-ligne ing-chiffres">
      <label><span>Quantité</span><input type="number" inputmode="decimal" step="any" value=${i.quantite ?? ''} onInput=${(e) => maj({ quantite: e.target.value })} /></label>
      <label><span>Unité</span>
        <select value=${i.unite} onChange=${(e) => maj({ unite: e.target.value })}>${UNITES.map((u) => html`<option value=${u}>${u}</option>`)}</select>
      </label>
      <label><span>Poids (g)</span><input type="number" inputmode="decimal" step="any" value=${i.poids ?? ''} onInput=${(e) => maj({ poids: e.target.value })} /></label>
    </div>
    <div class="ing-aliment">
      ${i.aliment && !cherche
        ? html`<span>Valeurs : ${i.aliment}</span><button type="button" class="btn-lien" onClick=${() => setCherche(true)}>Changer</button>`
        : !cherche
          ? html`<span class="aide">Aucune valeur nutritionnelle</span><button type="button" class="btn-lien" onClick=${() => setCherche(true)}>Choisir un aliment</button>`
          : html`<div class="cherche-aliment">
              <input type="search" autofocus placeholder="Chercher dans la table Ciqual" value=${q} onInput=${(e) => setQ(e.target.value)} aria-label="Chercher un aliment" />
              <ul>
                ${sugg.map((n) => html`<li><button type="button" onClick=${() => { maj({ aliment: n }); setCherche(false); setQ(''); }}>${n}</button></li>`)}
                ${!sugg.length && html`<li class="aide">Tape un mot, par exemple « tomate ».</li>`}
              </ul>
              <button type="button" class="btn-lien" onClick=${() => setCherche(false)}>Fermer</button>
            </div>`}
    </div>
  </div>`;
}
