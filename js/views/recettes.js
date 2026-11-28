import { html, useState, useMemo, useEffect } from '../vendor/htm-preact.js';
import { store } from '../store.js';
import { useStore, Plaque, Barre, Feuille, Compteur, Ico, naviguer, Image, Puce, MiniMacros, MACROS, niveauKcal } from '../ui.js';
import { norm, slug, duree, nombre, quantite, lundi, addDays, toISO, jourCourt, uid, jourLong, lienWeb } from '../util.js';
import { parPart, chargerDetails, detailsParPart, AR } from '../nutrition.js';
import { md } from '../md.js';
import { usePhoto, envoyerPhoto, envoyerCouverture } from '../photos.js';
import { MOMENTS } from './semaine.js';

const LS_TRI = 'yummy.triRecettes';
try {
  localStorage.removeItem('yummy.filtreType'); // ancien filtre mémorisé
} catch {
  /* stockage indisponible */
}
const SANS_LIVRE = 'Sans livre';
const INCONNU = 'Livre inconnu'; // recettes dont le livre d'origine n'a pas été retrouvé, rangées tout en bas
const EN_BAS = [SANS_LIVRE, INCONNU];
// Livres ouverts dans la vue « Par livre » : fermés par défaut, état gardé tant que l'app est ouverte.
const livresOuverts = new Set(); // sections placées après les livres, dans cet ordre
const rangLivre = (l) => EN_BAS.indexOf(l) + 1;
const WEB = 'Recettes du web'; // source des recettes trouvées sur internet, présentées à part
const TRIS = ['nom', 'livre', 'web', 'favoris'];
const estWeb = (r) => (r.sources || []).find(Boolean) === WEB;
// Étoile des favoris (partagés par toute la famille, enregistrés dans le livre de recettes).
function Etoile({ recette, classe = '' }) {
  const on = Boolean(recette.favori);
  const basculer = (e) => {
    e.preventDefault();
    store.faire('recettes', 'recette.favori', { id: recette.id, favori: !on });
    store.afficher(on ? 'Retirée des favoris' : 'Ajoutée aux favoris');
  };
  return html`<button type="button" class=${`etoile ${classe}`} aria-pressed=${on} aria-label=${on ? `Retirer ${recette.nom} des favoris` : `Ajouter ${recette.nom} aux favoris`} onClick=${basculer}>
    ${on ? Ico.etoilePleine() : Ico.etoile()}
  </button>`;
}

const site = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};
// Filtre de type gardé seulement pendant que l'app est ouverte (retour depuis une recette), jamais d'une ouverture à l'autre.
let filtreSession = '';
const parNom = (a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' });

// ---------- Photos ----------

function BoutonPhoto({ envoyer, classe, label, children }) {
  const [envoi, setEnvoi] = useState(false);
  const choisir = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setEnvoi(true);
    try {
      await envoyer(f);
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

// ---------- Macros d'une recette ----------
function CarteMacros({ pp, recette }) {
  const niv = niveauKcal(pp.kcal);
  // part de l'énergie apportée par chaque macro (4 kcal/g pour protéines et glucides, 9 pour les lipides)
  const e = { proteines: pp.proteines * 4, glucides: pp.glucides * 4, lipides: pp.lipides * 9 };
  const tot = e.proteines + e.glucides + e.lipides;
  return html`<section class="carte carte-macros" aria-labelledby="titre-macros">
    <div class="carte-tete">
      <h2 id="titre-macros">Par part</h2>
      ${niv && html`<span class=${`niveau niveau-${niv[0]}`}><span class="niveau-point"></span>${niv[1]}</span>`}
    </div>
    <ul class="macros">
      ${MACROS.map(([k, lib, u]) => (k === 'fibres' && !(pp.fibres > 0)) ? null : html`<li class=${`macro m-${k}`} key=${k}>
        <${Puce} k=${k} />
        <span class="macro-texte"><strong>${nombre(pp[k])}<small>${u === 'g' ? '\u202Fg' : '\u202Fkcal'}</small></strong><span>${lib}</span></span>
      </li>`)}
    </ul>
    ${tot > 0 && html`<div class="repartition" role="img" aria-label=${`Énergie : ${nombre((e.proteines / tot) * 100)} % protéines, ${nombre((e.glucides / tot) * 100)} % glucides, ${nombre((e.lipides / tot) * 100)} % lipides`}>
      <div class="repartition-barre">
        ${['proteines', 'glucides', 'lipides'].map((k) => html`<span class=${`m-${k}`} style=${{ width: `${(e[k] / tot) * 100}%` }}></span>`)}
      </div>
      <div class="repartition-legende" aria-hidden="true">
        ${['proteines', 'glucides', 'lipides'].map((k) => html`<span class=${`m-${k}`}><i></i>${nombre((e[k] / tot) * 100)} % ${MACROS.find((m) => m[0] === k)[1].toLowerCase()}</span>`)}
      </div>
    </div>`}
    ${pp.manquants.length > 0 && html`<p class="aide">Sans valeur nutritionnelle : ${pp.manquants.join(', ')}.</p>`}
    <${DetailsNutrition} recette=${recette} pp=${pp} />
  </section>`;
}

// ---------- Toutes les valeurs nutritionnelles (panneau dépliable) ----------
const nfDetail = (n) => {
  if (n === 0) return '0';
  const a = Math.abs(n);
  const max = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 1 : a >= 0.1 ? 2 : 3;
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: max }).format(n);
};
const GROUPES = [
  ['glucides', 'Glucides en détail'],
  ['lipides', 'Lipides en détail'],
  ['mineraux', 'Minéraux'],
  ['vitamines', 'Vitamines'],
  ['autres', 'Autres'],
];

function LigneNutriment({ k, libelle, valeur, unite, couverture = 1, sous }) {
  const inconnu = couverture === 0;
  const partiel = !inconnu && couverture < 0.8;
  const pct = !inconnu && AR[k] ? (valeur / AR[k]) * 100 : null;
  return html`<tr class=${sous ? 'sous' : ''}>
    <th scope="row">${libelle}</th>
    <td class="valeur">${inconnu ? html`<span class="non-mesure">non mesuré</span>` : html`${partiel ? html`<abbr title="Valeur non mesurée pour une partie des ingrédients : c’est un minimum">≥ </abbr>` : ''}${nfDetail(valeur)}\u202F${unite}`}</td>
    <td class="ar">${pct != null && html`<span class="ar-barre" aria-hidden="true"><span style=${{ width: `${Math.min(100, pct)}%` }}></span></span><span class="ar-pct">${nombre(pct)} %</span>`}</td>
  </tr>`;
}

function DetailsNutrition({ recette, pp }) {
  const s = useStore();
  const [ouvert, setOuvert] = useState(false);
  const [table, setTable] = useState(null);
  const [erreur, setErreur] = useState('');
  useEffect(() => {
    if (!ouvert || table) return;
    let actif = true;
    chargerDetails()
      .then((t) => actif && setTable(t))
      .catch((e) => actif && setErreur(e.message));
    return () => {
      actif = false;
    };
  }, [ouvert]);
  const d = useMemo(() => (table ? detailsParPart(recette, s.aliments, table) : null), [table, recette, s.aliments]);
  const ligne = ([k, lib, u]) => html`<${LigneNutriment} key=${k} k=${k} libelle=${lib} unite=${u} valeur=${d[k].valeur} couverture=${d[k].couverture} />`;
  return html`<details class="details-nutri" onToggle=${(e) => setOuvert(e.currentTarget.open)}>
    <summary><span>Toutes les valeurs nutritionnelles</span><span class="chevron">${Ico.droite()}</span></summary>
    ${ouvert &&
    (erreur
      ? html`<p class="aide">${erreur}</p>`
      : !d
        ? html`<p class="aide">Chargement…</p>`
        : html`<div class="details-corps">
            <p class="aide">Par part. Le % compare à l’apport de référence d’un adulte (2 000 kcal par jour).</p>
            <table class="tableau-nutri">
              <caption>Valeurs essentielles</caption>
              <thead><tr><th scope="col">Nutriment</th><th scope="col">Par part</th><th scope="col">% AR</th></tr></thead>
              <tbody>
                <${LigneNutriment} k="kcal" libelle=${html`Énergie <small>(${nombre(pp.kcal * 4.184)}\u202FkJ)</small>`} valeur=${pp.kcal} unite="kcal" />
                <${LigneNutriment} k="lipides" libelle="Lipides" valeur=${pp.lipides} unite="g" />
                <${LigneNutriment} k="ags" libelle="dont acides gras saturés" valeur=${d.ags.valeur} couverture=${d.ags.couverture} unite="g" sous />
                <${LigneNutriment} k="glucides" libelle="Glucides" valeur=${pp.glucides} unite="g" />
                <${LigneNutriment} k="sucres" libelle="dont sucres" valeur=${pp.sucres} unite="g" sous />
                <${LigneNutriment} k="fibres" libelle="Fibres" valeur=${pp.fibres} unite="g" />
                <${LigneNutriment} k="proteines" libelle="Protéines" valeur=${pp.proteines} unite="g" />
                <${LigneNutriment} k="sel" libelle="Sel" valeur=${pp.sel} unite="g" />
              </tbody>
            </table>
            ${GROUPES.map(([g, titre]) => {
              const ns = table.nutriments.filter((n) => n[3] === g && !(g === 'glucides' && n[0] === 'sucres') && !(g === 'lipides' && n[0] === 'ags'));
              return html`<table class="tableau-nutri" key=${g}>
                <caption>${titre}</caption>
                <tbody>${ns.map(ligne)}</tbody>
              </table>`;
            })}
            <p class="aide note">Source : ANSES, table Ciqual 2025. « ≥ » : la valeur n’est pas mesurée pour une partie des ingrédients, c’est donc un minimum. Les ingrédients sans correspondance Ciqual ne sont pas comptés.</p>
          </div>`)}
  </details>`;
}

// ---------- Liste ----------
export function Recettes() {
  const s = useStore();
  const [q, setQ] = useState('');
  const [type, setType] = useState(filtreSession);
  const [tri, setTri] = useState(() => {
    const v = localStorage.getItem(LS_TRI);
    return TRIS.includes(v) ? v : 'nom';
  });
  const recettes = s.local.recettes.recettes;
  const couvertures = s.local.recettes.livres || {};
  const types = useMemo(() => [...new Set(recettes.map((r) => r.type).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')), [recettes]);
  const liste = useMemo(() => {
    const n = norm(q);
    return recettes
      .filter((r) => {
        if (type && r.type !== type) return false;
        if (!n) return true;
        const foin = norm([r.nom, r.type, ...(r.etiquettes || []), ...(r.sources || []), ...r.ingredients.map((i) => i.nom)].join(' '));
        return n.split(/\s+/).every((m) => foin.includes(m));
      })
      .sort((a, b) => parNom(a.nom, b.nom));
  }, [q, type, recettes]);
  // Par nom : tout ; par livre : sans les recettes du web ; du web : seulement elles.
  const visibles = useMemo(() => {
    if (tri === 'web') return liste.filter(estWeb);
    if (tri === 'livre') return liste.filter((r) => !estWeb(r));
    if (tri === 'favoris') return liste.filter((r) => r.favori);
    return liste;
  }, [liste, tri]);
  // Par livre : une section par livre (première source de la recette), livres par ordre alphabétique, « Livre inconnu » en dernier.
  const livres = useMemo(() => {
    if (tri !== 'livre') return null;
    const m = new Map();
    for (const r of visibles) {
      const l = (r.sources || []).find(Boolean) || SANS_LIVRE;
      if (!m.has(l)) m.set(l, []);
      m.get(l).push(r);
    }
    return [...m].sort(([a], [b]) => rangLivre(a) - rangLivre(b) || parNom(a, b));
  }, [visibles, tri]);
  const [ouverts, setOuverts] = useState(() => new Set(livresOuverts));
  const recherche = Boolean(norm(q)) || Boolean(type); // pendant une recherche ou un filtre, tous les livres sont ouverts
  const basculer = (l) => {
    if (livresOuverts.has(l)) livresOuverts.delete(l);
    else livresOuverts.add(l);
    setOuverts(new Set(livresOuverts));
  };
  const toutOuvert = Boolean(livres) && livres.every(([l]) => ouverts.has(l));
  const toutBasculer = () => {
    if (toutOuvert) livresOuverts.clear();
    else livres.forEach(([l]) => livresOuverts.add(l));
    setOuverts(new Set(livresOuverts));
  };
  const choisirType = (t) => {
    const v = t === type ? '' : t;
    filtreSession = v;
    setType(v);
  };
  const choisirTri = (t) => {
    localStorage.setItem(LS_TRI, t);
    setTri(t);
  };
  const ligne = (r) => {
    const pp = parPart(r, s.aliments);
    return html`<li key=${r.id} class="ligne-recette">
      ${r.photo
        ? html`<a href=${`#/recette/${r.id}`} class="vignette" tabindex="-1" aria-hidden="true"><${Image} chemin=${r.photo.mini} /></a>`
        : html`<${BoutonPhoto} envoyer=${(f) => envoyerPhoto(r, f)} classe="vignette vignette-vide" label=${`Ajouter une photo de ${r.nom}`}>${Ico.plus()}<//>`}
      <a href=${`#/recette/${r.id}`} class="ligne-texte">
        <span class="liste-nom">${r.nom}</span>
        <span class="liste-meta">
          <span>${r.type}</span>
          ${tri === 'web' && site(r.url) && html`<span>${site(r.url)}</span>`}
          ${r.preparation + r.cuisson > 0 && html`<span class="avec-ico">${Ico.horloge()}${duree(r.preparation + r.cuisson)}</span>`}
        </span>
        ${pp.kcal > 0 && html`<${MiniMacros} pp=${pp} />`}
      </a>
      <${Etoile} recette=${r} />
    </li>`;
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
    <div class="segments segments-tri" role="group" aria-label="Trier les recettes">
      <button aria-pressed=${tri === 'nom'} onClick=${() => choisirTri('nom')}>Par nom</button>
      <button aria-pressed=${tri === 'livre'} onClick=${() => choisirTri('livre')}>Par livre</button>
      <button aria-pressed=${tri === 'web'} onClick=${() => choisirTri('web')}>Du web</button>
      <button aria-pressed=${tri === 'favoris'} onClick=${() => choisirTri('favoris')}>Favoris</button>
    </div>
    ${livres && !recherche && livres.length > 1 &&
    html`<div class="livres-actions"><button type="button" class="lien-discret" onClick=${toutBasculer}>${toutOuvert ? 'Tout fermer' : 'Tout ouvrir'}</button></div>`}
    ${livres
      ? livres.map(([livre, rs]) => {
          const photo = couvertures[livre]?.photo;
          const envoi = (f) => envoyerCouverture(livre, f);
          const ouvert = recherche || ouverts.has(livre);
          const idListe = `livre-${slug(livre) || 'livre'}`;
          return html`<section class=${`livre${ouvert ? ' ouvert' : ''}`} key=${livre}>
            <div class="livre-tete">
              ${!EN_BAS.includes(livre) && !photo
                ? html`<${BoutonPhoto} envoyer=${envoi} classe="couverture couverture-vide" label=${`Ajouter la couverture de ${livre}`}>${Ico.plus()}<//>`
                : null}
              <h2>
                <button type="button" class="livre-bascule" aria-expanded=${ouvert} aria-controls=${idListe} onClick=${() => !recherche && basculer(livre)}>
                  ${photo && !EN_BAS.includes(livre) ? html`<span class="couverture"><${Image} chemin=${photo.mini} /></span>` : null}
                  <span class="livre-titre"><span class="livre-nom">${livre}</span><small>${rs.length} ${rs.length > 1 ? 'recettes' : 'recette'}</small></span>
                  <span class="chevron">${Ico.droite()}</span>
                </button>
              </h2>
            </div>
            ${ouvert &&
            html`<div id=${idListe}>
              ${photo && !EN_BAS.includes(livre)
                ? html`<div class="livre-outils"><${BoutonPhoto} envoyer=${envoi} classe="lien-discret" label=${`Changer la couverture de ${livre}`}>Changer la couverture<//></div>`
                : null}
              <ul class="liste-recettes">${rs.map(ligne)}</ul>
            </div>`}
          </section>`;
        })
      : html`<ul class="liste-recettes">${visibles.map(ligne)}</ul>`}
    ${!visibles.length &&
    html`<div class="vide">
      ${tri === 'favoris' && !q && !type
        ? html`<p>Aucun favori pour l’instant.</p><p>Touche l’étoile d’une recette pour la retrouver ici.</p>`
        : tri === 'web' && !q && !type
        ? html`<p>Aucune recette du web pour l’instant.</p><p>Envoie à Claude le lien ou une capture d’une recette trouvée en ligne.</p>`
        : recettes.length ? html`<p>Aucune recette ne correspond à cette recherche.</p>` : html`<p>Le livre est vide.</p><p>Les recettes s’ajoutent en envoyant la photo d’une recette à Claude.</p>`}
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

  const source = (r.sources || []).filter(Boolean).join(', ');
  return html`<main class=${`vue vue-recette${r.photo ? ' avec-photo' : ''}`}>
    <${Barre} retour="#/recettes" retourLabel="Recettes">
      <${Etoile} recette=${r} classe="etoile-barre" />
      <a class="btn btn-petit btn-second" href=${`#/recette/${r.id}/modifier`}>Modifier</a>
    <//>
    ${r.photo
      ? html`<figure class="photo-plat">
          <${Image} chemin=${r.photo.grande} alt=${`Photo du plat : ${r.nom}`} />
          <${BoutonPhoto} envoyer=${(f) => envoyerPhoto(r, f)} classe="photo-changer" label="Changer la photo">${Ico.photo()}<//>
        </figure>`
      : html`<${BoutonPhoto} envoyer=${(f) => envoyerPhoto(r, f)} classe="photo-vide" label="Ajouter une photo du plat">${Ico.plus()}<span>Ajouter une photo du plat</span><//>`}
    <div class="fiche-corps">
    <header class="fiche-tete">
      ${r.type && html`<p class="fiche-type">${r.type}</p>`}
      <h1 class="fiche-titre">${r.nom}</h1>
      ${source && html`<p class="fiche-source">${source}</p>`}
    </header>

    <ul class="faits">
      ${r.difficulte && html`<li><small>Difficulté</small><strong>${r.difficulte}</strong></li>`}
      ${r.preparation > 0 && html`<li><small>Préparation</small><strong>${duree(r.preparation)}</strong></li>`}
      <li><small>Cuisson</small><strong>${r.cuisson ? duree(r.cuisson) : 'aucune'}</strong></li>
    </ul>

    ${(r.etiquettes || []).length > 0 && html`<ul class="etiquettes" aria-label="Étiquettes">${r.etiquettes.map((e) => html`<li key=${e}>${e}</li>`)}</ul>`}

    ${r.intro && html`<section class="bloc texte intro" dangerouslySetInnerHTML=${{ __html: md(r.intro) }}></section>`}

    <${CarteMacros} pp=${pp} recette=${r} />

    <button class="btn btn-large" onClick=${() => setPlanifier(true)}>${Ico.semaine()}<span>Planifier ce plat</span></button>

    <section class="bloc carte">
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

    ${r.etapes &&
    html`<section class="bloc carte texte">
      <h2>Préparation</h2>
      <div dangerouslySetInnerHTML=${{ __html: md(r.etapes) }}></div>
    </section>`}

    ${r.ingredients_texte &&
    html`<details class="bloc texte origine">
      <summary>Liste d’ingrédients d’origine (pour ${r.portions} ${r.portions > 1 ? 'parts' : 'part'})</summary>
      <div dangerouslySetInnerHTML=${{ __html: md(r.ingredients_texte) }}></div>
    </details>`}

    ${lienWeb(r.url) && html`<p class="aide"><a href=${lienWeb(r.url)} target="_blank" rel="noopener">Recette en ligne</a></p>`}
    <p class="centre"><button class="btn-danger" onClick=${supprimer}>Supprimer la recette</button></p>
    </div>

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
