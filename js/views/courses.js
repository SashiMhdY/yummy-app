import { html, useState, useMemo } from '../vendor/htm-preact.js';
import { store } from '../store.js';
import { useStore, Plaque, Barre, Ico, naviguer } from '../ui.js';
import { lundi, addDays, toISO, fromISO, semaineISO, plageSemaine, cleSemaine, quantite, uid } from '../util.js';
import { listeCourses, RAYONS } from '../nutrition.js';

const LS_MASQUER = 'yummy.masquerCoches';

export function Courses({ q }) {
  const s = useStore();
  const debut = lundi(q.d ? fromISO(q.d) : new Date());
  const semaine = cleSemaine(debut);
  const [masquer, setMasquer] = useState(() => localStorage.getItem(LS_MASQUER) === '1');
  const [nouvel, setNouvel] = useState('');
  const allerA = (d) => naviguer(`#/courses?d=${toISO(d)}`);
  const estCetteSemaine = toISO(lundi(new Date())) === toISO(debut);

  const { articles, nbRepas } = useMemo(() => {
    const parId = new Map(s.local.recettes.recettes.map((r) => [r.id, r]));
    const repas = [];
    for (let i = 0; i < 7; i++) {
      const j = s.local.planning.repas[toISO(addDays(debut, i))] || {};
      for (const l of Object.values(j)) for (const e of l) if (e.r && parId.get(e.r)) repas.push({ recette: parId.get(e.r), parts: e.p || 1 });
    }
    return { articles: listeCourses(repas, s.aliments), nbRepas: repas.length };
  }, [s.local.recettes, s.local.planning, s.aliments, semaine]);

  const coches = s.local.courses.coches[semaine] || {};
  const extras = s.local.courses.extras[semaine] || [];
  const tous = [...articles.map((a) => a.cle), ...extras.map((x) => `x:${x.id}`)];
  const nbCoches = tous.filter((c) => coches[c]).length;

  const cocher = (cle, val) => store.faire('courses', 'coche', { semaine, cle, val });
  const ajouter = (e) => {
    e.preventDefault();
    const nom = nouvel.trim();
    if (!nom) return;
    store.faire('courses', 'extra.ajouter', { semaine, item: { id: uid(), nom } });
    setNouvel('');
  };
  const basculerMasquer = () => {
    localStorage.setItem(LS_MASQUER, masquer ? '0' : '1');
    setMasquer(!masquer);
  };
  const vider = () => {
    if (confirm('Décocher tous les articles de cette semaine ?')) store.faire('courses', 'coches.vider', { semaine });
  };

  const parRayon = RAYONS.map(([id, lib]) => [id, lib, articles.filter((a) => a.rayon === id)]);

  const ligne = ({ cle, nom, qte, detail, retirer }) => {
    const ok = Boolean(coches[cle]);
    if (masquer && ok) return null;
    return html`<li class=${`article${ok ? ' coche' : ''}`} key=${cle}>
      <label>
        <input type="checkbox" checked=${ok} onChange=${(e) => cocher(cle, e.target.checked)} />
        <span class="case" aria-hidden="true">${Ico.coche()}</span>
        <span class="article-texte">
          <span class="article-nom">${nom}</span>
          ${detail && html`<span class="article-detail">${detail}</span>`}
        </span>
        ${qte && html`<span class="article-qte">${qte}</span>`}
      </label>
      ${retirer && html`<button class="btn-icone btn-retirer" onClick=${retirer} aria-label=${`Retirer ${nom}`}>${Ico.croix()}</button>`}
    </li>`;
  };

  const ligneArticle = (a) =>
    ligne({ cle: a.cle, nom: a.nom, qte: a.qte ? `${a.qte.approx ? 'env. ' : ''}${quantite(a.qte.val, a.qte.unite)}` : '', detail: a.recettes.join(', ') });

  return html`<main class="vue">
    <${Barre} />
    <${Plaque} sous=${`Semaine ${semaineISO(debut).num}, ${plageSemaine(debut)}`}>Courses<//>
    <div class="nav-semaine">
      <button class="btn-icone" onClick=${() => allerA(addDays(debut, -7))} aria-label="Semaine précédente">${Ico.gauche()}</button>
      <button class="btn-lien" onClick=${() => allerA(new Date())} disabled=${estCetteSemaine}>Cette semaine</button>
      <button class="btn-icone" onClick=${() => allerA(addDays(debut, 7))} aria-label="Semaine suivante">${Ico.droite()}</button>
    </div>

    ${tous.length
      ? html`<div class="panier">
          <div class="panier-jauge" role="progressbar" aria-valuemin="0" aria-valuemax=${tous.length} aria-valuenow=${nbCoches} aria-label="Articles dans le panier">
            <span style=${{ width: `${(100 * nbCoches) / tous.length}%` }}></span>
          </div>
          <p>${nbCoches} sur ${tous.length} dans le panier${nbRepas ? `, pour ${nbRepas} ${nbRepas > 1 ? 'repas' : 'repas'}` : ''}</p>
          <label class="interrupteur">
            <input type="checkbox" checked=${masquer} onChange=${basculerMasquer} />
            <span>Masquer ce qui est coché</span>
          </label>
        </div>`
      : html`<div class="vide">
          <p>Aucun repas prévu cette semaine.</p>
          <p>Planifie des recettes dans l’onglet Semaine : leurs ingrédients s’ajouteront ici.</p>
          <a class="btn btn-second" href=${`#/semaine?d=${toISO(debut)}`}>Planifier la semaine</a>
        </div>`}

    ${parRayon
      .filter(([id, , l]) => l.length && id !== 'placard')
      .map(
        ([id, lib, l]) => html`<section class="rayon" key=${id}>
          <h2>${lib}</h2>
          <ul>${l.map(ligneArticle)}</ul>
        </section>`,
      )}

    ${extras.length > 0 &&
    html`<section class="rayon">
      <h2>Ajouts</h2>
      <ul>
        ${extras.map((x) => ligne({ cle: `x:${x.id}`, nom: x.nom, retirer: () => store.faire('courses', 'extra.retirer', { semaine, id: x.id }) }))}
      </ul>
    </section>`}

    ${(() => {
      const placard = parRayon.find(([id]) => id === 'placard')[2];
      if (!placard.length) return null;
      const reste = placard.filter((a) => !coches[a.cle]).length;
      return html`<details class="rayon rayon-placard">
        <summary><h2>Sel, poivre et épices</h2><span>${reste ? `${reste} à vérifier` : 'tout est là'}</span></summary>
        <ul>${placard.map(ligneArticle)}</ul>
      </details>`;
    })()}

    <form class="ajout-article" onSubmit=${ajouter}>
      <label for="nouvel">Ajouter un article</label>
      <div class="ligne-champ">
        <input id="nouvel" value=${nouvel} onInput=${(e) => setNouvel(e.target.value)} placeholder="Papier cuisson, café…" autocomplete="off" />
        <button class="btn" type="submit">Ajouter</button>
      </div>
    </form>

    ${nbCoches > 0 && html`<p class="centre"><button class="btn-lien" onClick=${vider}>Tout décocher</button></p>`}
  </main>`;
}
