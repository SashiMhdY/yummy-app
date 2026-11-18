import { html, useState, useMemo } from '../vendor/htm-preact.js';
import { store } from '../store.js';
import { useStore, Plaque, Barre, Feuille, Ico } from '../ui.js';
import { addDays, toISO, fromISO, jourLong, jourMois, aujourdhui, nombre, uid } from '../util.js';
import { parPart, besoins, ACTIVITES } from '../nutrition.js';
import { MOMENTS } from './semaine.js';

const LS_PROFIL = 'yummy.profil';

const NUTRIMENTS = [
  ['kcal', 'Énergie', 'kcal'],
  ['proteines', 'Protéines', 'g'],
  ['glucides', 'Glucides', 'g'],
  ['lipides', 'Lipides', 'g'],
  ['fibres', 'Fibres', 'g'],
];

const nf2 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const fmtPart = (p) => `${nf2.format(p)} ${p > 1 ? 'parts' : 'part'}`;

export function Profils() {
  const s = useStore();
  const profils = s.local.profils.profils;
  const [choisi, setChoisi] = useState(() => localStorage.getItem(LS_PROFIL));
  const [date, setDate] = useState(aujourdhui());
  const [edition, setEdition] = useState(null); // profil ou {} pour un nouveau
  const profil = profils.find((p) => p.id === choisi) || profils[0];
  const choisir = (id) => {
    localStorage.setItem(LS_PROFIL, id);
    setChoisi(id);
  };

  const parId = useMemo(() => new Map(s.local.recettes.recettes.map((r) => [r.id, r])), [s.local.recettes]);
  const repas = useMemo(() => {
    const j = s.local.planning.repas[date] || {};
    return MOMENTS.flatMap(([m, lib]) => (j[m] || []).filter((e) => e.r && parId.get(e.r)).map((e) => ({ entree: e, moment: lib, recette: parId.get(e.r) })));
  }, [s.local.planning, date, parId]);

  const d = fromISO(date);
  const titreJour = `${jourLong(d)} ${jourMois(d)}`;

  return html`<main class="vue">
    <${Barre} />
    <${Plaque} sous="Ce que chacun mange, comparé à ses besoins du jour">Profils<//>

    <div class="filtres profils-choix" role="tablist" aria-label="Profils">
      ${profils.map(
        (p) => html`<button role="tab" aria-selected=${p.id === profil?.id} class=${`filtre${p.id === profil?.id ? ' actif' : ''}`} onClick=${() => choisir(p.id)}>${p.nom}</button>`,
      )}
      <button class="filtre filtre-ajout" onClick=${() => setEdition({})} aria-label="Ajouter un profil">${Ico.plus()}<span>Profil</span></button>
    </div>

    ${profil
      ? html`<${Fiche} profil=${profil} date=${date} setDate=${setDate} titreJour=${titreJour} repas=${repas} onModifier=${() => setEdition(profil)} />`
      : html`<div class="vide"><p>Aucun profil.</p><p>Ajoute un membre de la famille pour suivre ses apports.</p></div>`}

    ${edition && html`<${EditionProfil} profil=${edition} onFermer=${() => setEdition(null)} onCree=${choisir} />`}
  </main>`;
}

function Fiche({ profil, date, setDate, titreJour, repas, onModifier }) {
  const s = useStore();
  const b = besoins(profil);
  const conso = s.local.profils.consommations[date]?.[profil.id] || {};
  const habituelle = Number(profil.portion) || 1;
  const portionDe = (e) => (e.id in conso ? conso[e.id] : habituelle);

  const apports = { kcal: 0, proteines: 0, glucides: 0, lipides: 0, fibres: 0 };
  for (const { entree, recette } of repas) {
    const p = portionDe(entree);
    const pp = parPart(recette, s.aliments);
    for (const k of Object.keys(apports)) apports[k] += (pp[k] || 0) * p;
  }

  const regler = (entree, portion) => store.faire('profils', 'conso.regler', { date, profil: profil.id, entree: entree.id, portion });
  const activite = ACTIVITES.find(([v]) => v === Number(profil.activite));
  const adulte = Number(profil.age) >= 18;

  return html`<section class="fiche-profil">
    <div class="profil-tete">
      <p class="profil-ident">
        ${[profil.sexe === 'femme' ? 'Femme' : 'Homme', profil.age ? `${profil.age} ans` : null, profil.taille ? `${profil.taille} cm` : null, profil.poids ? `${nombre(Number(profil.poids), 1)} kg` : null].filter(Boolean).join(', ')}
      </p>
      <button class="btn btn-petit btn-second" onClick=${onModifier}>Modifier</button>
    </div>
    ${b.manque.length
      ? html`<p class="alerte-douce">Renseigne ${b.manque.join(' et ')} pour estimer les besoins.</p>`
      : b.kcal
        ? html`<p class="aide">Besoin estimé : <strong>${nombre(b.kcal)} kcal</strong> par jour (${b.methode}${adulte && activite ? `, ${activite[1].toLowerCase()}` : ''}).</p>`
        : html`<p class="aide">Pas de repère énergétique disponible pour cet âge.</p>`}

    <div class="nav-jour">
      <button class="btn-icone" onClick=${() => setDate(toISO(addDays(fromISO(date), -1)))} aria-label="Jour précédent">${Ico.gauche()}</button>
      <div class="nav-jour-titre">
        <strong>${titreJour}</strong>
        ${date !== aujourdhui() && html`<button class="btn-lien" onClick=${() => setDate(aujourdhui())}>Revenir à aujourd’hui</button>`}
      </div>
      <button class="btn-icone" onClick=${() => setDate(toISO(addDays(fromISO(date), 1)))} aria-label="Jour suivant">${Ico.droite()}</button>
    </div>

    <ul class="jauges">
      ${NUTRIMENTS.map(([k, lib, unite]) => {
        const cible = b[k];
        if (cible == null) return null;
        return html`<${Jauge} key=${k} libelle=${lib} unite=${unite} valeur=${apports[k]} cible=${cible} />`;
      })}
    </ul>

    <h2 class="titre-section">Repas du jour</h2>
    ${repas.length
      ? html`<ul class="repas-profil">
          ${repas.map(({ entree, moment, recette }) => {
            const p = portionDe(entree);
            const mange = p > 0;
            const kcal = parPart(recette, s.aliments).kcal * p;
            return html`<li key=${entree.id} class=${mange ? '' : 'pas-mange'}>
              <label class="repas-coche">
                <input type="checkbox" checked=${mange} onChange=${(e) => regler(entree, e.target.checked ? null : 0)} />
                <span class="case" aria-hidden="true">${Ico.coche()}</span>
                <span class="repas-texte">
                  <span class="repas-nom">${recette.nom}</span>
                  <span class="repas-detail">${moment}${mange ? `, ${nombre(kcal)} kcal` : ', pas mangé'}</span>
                </span>
              </label>
              ${mange &&
              html`<div class="compteur compteur-petit" role="group" aria-label=${`Portion de ${recette.nom}`}>
                <button class="btn-icone" onClick=${() => regler(entree, Math.max(0.25, p - 0.25))} disabled=${p <= 0.25} aria-label="Moins">${Ico.moins()}</button>
                <output>${fmtPart(p)}</output>
                <button class="btn-icone" onClick=${() => regler(entree, Math.min(4, p + 0.25))} aria-label="Plus">${Ico.plus()}</button>
              </div>`}
            </li>`;
          })}
        </ul>`
      : html`<div class="vide"><p>Aucun plat prévu ce jour-là.</p><p>Les plats ajoutés dans l’onglet Semaine apparaissent ici.</p></div>`}

    <p class="aide note">
      Part habituelle : ${fmtPart(habituelle)} de chaque plat, modifiable plat par plat. Estimations indicatives : formule de Black pour les adultes, besoins moyens de l’EFSA pour les enfants, repères de l’Anses pour les protéines, lipides, glucides et fibres. Ce n’est pas un avis médical.
    </p>
  </section>`;
}

function Jauge({ libelle, unite, valeur, cible }) {
  const plage = typeof cible === 'object' ? cible : null;
  const ref = plage ? (plage.min + plage.max) / 2 : cible;
  const pct = ref ? (valeur / ref) * 100 : 0;
  const ECHELLE = 130; // la barre va jusqu'à 130 % du repère
  const w = (x) => `${Math.min(100, (x / ECHELLE) * 100)}%`;
  const texteCible = plage ? `${nombre(plage.min)} à ${nombre(plage.max)} ${unite}` : `${nombre(ref)} ${unite}`;
  return html`<li class=${`jauge${pct > 100 ? ' depasse' : ''}`}>
    <div class="jauge-tete">
      <span class="jauge-nom">${libelle}</span>
      <span class="jauge-pct">${nombre(pct)} %</span>
    </div>
    <div class="jauge-barre" role="meter" aria-valuemin="0" aria-valuemax="130" aria-valuenow=${Math.round(pct)} aria-label=${`${libelle} : ${nombre(pct)} % du repère`}>
      ${plage && html`<span class="jauge-plage" style=${{ left: w((plage.min / ref) * 100), width: `calc(${w((plage.max / ref) * 100)} - ${w((plage.min / ref) * 100)})` }}></span>`}
      <span class="jauge-rempli" style=${{ width: w(pct) }}></span>
      <span class="jauge-repere" style=${{ left: w(100) }}></span>
    </div>
    <p class="jauge-detail">${nombre(valeur)} ${unite} sur ${texteCible}</p>
  </li>`;
}

function EditionProfil({ profil, onFermer, onCree }) {
  const s = useStore();
  const nouveau = !profil.id;
  const [f, setF] = useState(() => ({ nom: '', sexe: 'homme', age: '', taille: '', poids: '', activite: 1.6, portion: 1, ...profil }));
  const [erreur, setErreur] = useState('');
  const maj = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));

  const enregistrer = (e) => {
    e.preventDefault();
    if (!f.nom.trim()) return setErreur('Donne un nom au profil.');
    const p = {
      id: f.id || uid(),
      nom: f.nom.trim(),
      sexe: f.sexe,
      age: num(f.age),
      taille: num(f.taille),
      poids: num(f.poids),
      activite: Number(f.activite) || 1.6,
      portion: num(f.portion) || 1,
    };
    store.faire('profils', 'profil.enregistrer', { profil: p });
    if (nouveau) onCree(p.id);
    store.afficher('Profil enregistré');
    onFermer();
  };
  const supprimer = () => {
    if (!confirm(`Supprimer le profil « ${profil.nom} » ?`)) return;
    store.faire('profils', 'profil.supprimer', { id: profil.id });
    store.afficher('Profil supprimé');
    onFermer();
  };

  return html`<${Feuille} titre=${nouveau ? 'Nouveau profil' : `Modifier ${profil.nom}`} onFermer=${onFermer}>
    <form class="formulaire" onSubmit=${enregistrer} novalidate>
      <label class="champ"><span>Nom</span><input value=${f.nom} onInput=${(e) => maj('nom', e.target.value)} autofocus /></label>
      <div class="segments" role="group" aria-label="Sexe">
        <button type="button" aria-pressed=${f.sexe === 'homme'} onClick=${() => maj('sexe', 'homme')}>Homme</button>
        <button type="button" aria-pressed=${f.sexe === 'femme'} onClick=${() => maj('sexe', 'femme')}>Femme</button>
      </div>
      <div class="grille-3">
        <label class="champ"><span>Âge (ans)</span><input type="number" inputmode="numeric" min="1" value=${f.age ?? ''} onInput=${(e) => maj('age', e.target.value)} /></label>
        <label class="champ"><span>Taille (cm)</span><input type="number" inputmode="numeric" min="40" value=${f.taille ?? ''} onInput=${(e) => maj('taille', e.target.value)} /></label>
        <label class="champ"><span>Poids (kg)</span><input type="number" inputmode="decimal" step="0.1" min="2" value=${f.poids ?? ''} onInput=${(e) => maj('poids', e.target.value)} /></label>
      </div>
      <label class="champ">
        <span>Activité physique (adultes)</span>
        <select value=${f.activite} onChange=${(e) => maj('activite', e.target.value)}>
          ${ACTIVITES.map(([v, lib]) => html`<option value=${v}>${lib}</option>`)}
        </select>
      </label>
      <label class="champ">
        <span>Part habituelle de chaque plat</span>
        <select value=${f.portion} onChange=${(e) => maj('portion', e.target.value)}>
          ${[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((v) => html`<option value=${v}>${fmtPart(v)}</option>`)}
        </select>
      </label>
      ${erreur && html`<p class="erreurs" role="alert">${erreur}</p>`}
      <div class="actions">
        <button class="btn btn-large" type="submit">Enregistrer le profil</button>
        ${!nouveau && html`<button type="button" class="btn-danger" onClick=${supprimer}>Supprimer le profil</button>`}
      </div>
    </form>
  <//>`;
}
