// Macros des recettes et liste de courses.
import { norm } from './util.js';

export const MACROS = [
  ['kcal', 'kcal', ''],
  ['proteines', 'protéines', 'g'],
  ['glucides', 'glucides', 'g'],
  ['lipides', 'lipides', 'g'],
];

export function macrosRecette(recette, aliments) {
  const t = { kcal: 0, proteines: 0, glucides: 0, lipides: 0, fibres: 0, sucres: 0, sel: 0, manquants: [] };
  for (const ing of recette.ingredients || []) {
    const a = ing.aliment && aliments[ing.aliment];
    if (estEau(ing)) continue;
    if (!a || ing.poids == null) {
      t.manquants.push(ing.nom);
      continue;
    }
    const k = ing.poids / 100;
    t.kcal += (a.kcal || 0) * k;
    t.proteines += (a.proteines || 0) * k;
    t.glucides += (a.glucides || 0) * k;
    t.lipides += (a.lipides || 0) * k;
    t.fibres += (a.fibres || 0) * k;
    t.sucres += (a.sucres || 0) * k;
    t.sel += (a.sel || 0) * k;
  }
  return t;
}

export function parPart(recette, aliments) {
  const t = macrosRecette(recette, aliments);
  const p = Math.max(1, recette.portions || 1);
  return { kcal: t.kcal / p, proteines: t.proteines / p, glucides: t.glucides / p, lipides: t.lipides / p, fibres: t.fibres / p, sucres: t.sucres / p, sel: t.sel / p, manquants: t.manquants };
}

// ---------- Composition complète (table Ciqual détaillée, chargée à la demande) ----------
let details = null;
export function chargerDetails() {
  details ||= fetch('./data/nutriments.json')
    .then((r) => {
      if (!r.ok) throw new Error('Valeurs détaillées indisponibles.');
      return r.json();
    })
    .catch((e) => {
      details = null;
      throw e;
    });
  return details;
}

// Apports de référence d'un adulte (Règlement UE n° 1169/2011, annexe XIII), pour les % affichés.
export const AR = {
  kcal: 2000, proteines: 50, glucides: 260, sucres: 90, lipides: 70, ags: 20, sel: 6,
  potassium: 2000, chlorure: 800, calcium: 800, phosphore: 700, magnesium: 375, fer: 14, zinc: 10, cuivre: 1,
  manganese: 2, selenium: 55, iode: 150,
  vita: 800, vitd: 5, vite: 12, vitk1: 75, vitc: 80, vitb1: 1.1, vitb2: 1.4, vitb3: 16, vitb5: 6, vitb6: 1.4, vitb9: 200, vitb12: 2.5,
};

// Par part, pour chaque nutriment détaillé : { valeur, couverture } ; couverture = part du poids des
// ingrédients (reliés à Ciqual) pour lesquels la valeur est mesurée (0 à 1).
export function detailsParPart(recette, aliments, table) {
  const cles = table.nutriments.map((n) => n[0]);
  const somme = cles.map(() => 0);
  const connu = cles.map(() => 0);
  let poids = 0;
  for (const ing of recette.ingredients || []) {
    if (estEau(ing) || !ing.aliment || !aliments[ing.aliment] || ing.poids == null) continue;
    poids += ing.poids;
    const v = table.aliments[ing.aliment] || [];
    cles.forEach((_, i) => {
      if (v[i] == null) return;
      somme[i] += (v[i] * ing.poids) / 100;
      connu[i] += ing.poids;
    });
  }
  const p = Math.max(1, recette.portions || 1);
  const r = {};
  cles.forEach((k, i) => {
    r[k] = { valeur: somme[i] / p, couverture: poids ? connu[i] / poids : 0 };
  });
  return r;
}

// ---------- Besoins journaliers d'un profil ----------
// Sources :
// - Adultes, métabolisme de base : Black et al. (1996), en MJ/j, × 1000 / 4,1855 pour les kcal ;
//   multiplié par le niveau d'activité physique (NAP 1,4 / 1,6 / 1,8 / 2,0, valeurs retenues par l'EFSA, 2013).
// - Enfants, énergie : besoins moyens de l'EFSA (2013), NAP 1,4 de 1 à 9 ans, 1,6 à 10 ans.
// - Protéines : 0,83 g/kg/j chez l'adulte (Anses) ; enfants : références EFSA (2012) en g/kg/j.
// - Lipides 35 à 40 % et glucides 40 à 55 % de l'apport énergétique (Anses 2016, enfants de 4 à 17 ans : Anses 2019).
// - Fibres : 30 g/j chez l'adulte, 14 g de 4 à 6 ans, 16 g de 7 à 10 ans, 19 g de 11 à 17 ans (Anses 2016 et 2019).
export const ACTIVITES = [
  [1.4, 'Sédentaire'],
  [1.6, 'Modérément actif'],
  [1.8, 'Actif'],
  [2.0, 'Très actif'],
];
const EFSA_ENERGIE_ENFANT = {
  // âge : [fille, garçon] en kcal/j
  1: [712, 777], 2: [946, 1028], 3: [1096, 1174], 4: [1168, 1256], 5: [1239, 1332],
  6: [1312, 1409], 7: [1392, 1497], 8: [1477, 1592], 9: [1566, 1684], 10: [1818, 1933],
};
const EFSA_PROTEINES_ENFANT = {
  1: 1.14, 2: 0.97, 3: 0.9, 4: 0.86, 5: 0.85, 6: 0.89, 7: 0.91, 8: 0.92, 9: 0.91, 10: 0.91,
  // 11 à 17 ans : [fille, garçon]
  11: [0.9, 0.91], 12: [0.89, 0.9], 13: [0.88, 0.9], 14: [0.87, 0.89], 15: [0.85, 0.88], 16: [0.84, 0.87], 17: [0.83, 0.86],
};

export function besoins(p) {
  const age = Number(p.age);
  const poids = Number(p.poids);
  const taille = Number(p.taille) / 100;
  const garcon = p.sexe === 'homme' ? 1 : 0;
  const r = { kcal: null, proteines: null, lipides: null, glucides: null, fibres: null, methode: '', manque: [] };
  if (!age) r.manque.push('l’âge');
  if (!poids) r.manque.push('le poids');
  if (age >= 18 && !taille) r.manque.push('la taille');
  if (r.manque.length) return r;

  if (age >= 18) {
    const mj = (garcon ? 1.083 : 0.963) * poids ** 0.48 * taille ** 0.5 * age ** -0.13;
    const nap = Number(p.activite) || 1.6;
    r.kcal = ((mj * 1000) / 4.1855) * nap;
    r.methode = 'formule de Black';
    r.proteines = 0.83 * poids;
    r.fibres = 30;
  } else {
    const e = EFSA_ENERGIE_ENFANT[age];
    if (e) {
      r.kcal = e[garcon];
      r.methode = 'besoin moyen de l’EFSA pour cet âge';
    }
    const pr = EFSA_PROTEINES_ENFANT[age];
    if (pr) r.proteines = (Array.isArray(pr) ? pr[garcon] : pr) * poids;
    r.fibres = age >= 11 ? 19 : age >= 7 ? 16 : age >= 4 ? 14 : null;
  }
  if (r.kcal && age >= 4) {
    r.lipides = { min: (r.kcal * 0.35) / 9, max: (r.kcal * 0.4) / 9 };
    r.glucides = { min: (r.kcal * 0.4) / 4, max: (r.kcal * 0.55) / 4 };
  }
  return r;
}

const estEau = (ing) => /^eau\b/.test(norm(ing.aliment || '')) || /^eau\b/.test(norm(ing.nom));

// ---------- Rayons ----------
export const RAYONS = [
  ['fruits-legumes', 'Fruits et légumes'],
  ['boulangerie', 'Boulangerie'],
  ['boucherie', 'Boucherie et poissonnerie'],
  ['charcuterie', 'Charcuterie'],
  ['frais', 'Rayon frais'],
  ['cremerie', 'Crèmerie et œufs'],
  ['fromages', 'Fromages'],
  ['epicerie', 'Épicerie salée'],
  ['epicerie-sucree', 'Épicerie sucrée'],
  ['boissons', 'Boissons'],
  ['placard', 'Sel, poivre et épices'],
  ['autres', 'Autres'],
];

const PAR_NOM = [
  [/feuilletee|pate brisee|pate sablee|pate a pizza|galette de sarrasin|levure de boulanger(?! deshydratee)/, 'frais'],
  [/^oeuf/, 'cremerie'],
  [/farine|fecule|amidon|flocon|semoule|couscous|levure chimique|levure de boulanger deshydratee|tomate, sechee/, 'epicerie'],
  [/^ail, cru|ciboul|coriandre|menthe|persil|thym, frais|herbes aromatiques fraiches|raifort|basilic, frais|aneth/, 'fruits-legumes'],
];

const PAR_SOUS_GROUPE = {
  legumes: 'fruits-legumes',
  fruits: 'fruits-legumes',
  'pommes de terre et autres tubercules': 'fruits-legumes',
  legumineuses: 'epicerie',
  'fruits a coque et graines oleagineuses': 'epicerie',
  herbes: 'placard',
  epices: 'placard',
  sels: 'placard',
  condiments: 'epicerie',
  sauces: 'epicerie',
  'ingredients divers': 'epicerie',
  soupes: 'epicerie',
  'huiles et graisses vegetales': 'epicerie',
  pates: 'epicerie',
  'charcuteries et assimiles': 'charcuterie',
  'viandes cuites': 'boucherie',
  'viandes crues': 'boucherie',
  'mollusques et crustaces crus': 'boucherie',
  'mollusques et crustaces cuits': 'boucherie',
  'poissons crus': 'boucherie',
  'poissons cuits': 'boucherie',
  oeufs: 'cremerie',
  'fromages et assimiles': 'fromages',
  'fromages et alternatives vegetales': 'fromages',
  'cremes et specialites a base de creme': 'cremerie',
  laits: 'cremerie',
  'produits laitiers frais et assimiles': 'cremerie',
  'produits laitiers frais et alternatives vegetales': 'cremerie',
  beurres: 'cremerie',
  'pains et assimiles': 'boulangerie',
  'chocolats et produits a base de chocolat': 'epicerie-sucree',
  'miels et assimiles': 'epicerie-sucree',
  'gateaux et patisseries': 'epicerie-sucree',
  'sucres, miels et assimiles': 'epicerie-sucree',
  'boisson alcoolisees': 'boissons',
  'boissons alcoolisees': 'boissons',
  'boissons sans alcool': 'boissons',
  // Sous-groupes de la table Ciqual 2025
  'aides culinaires': 'epicerie',
  algues: 'epicerie',
  'denrees destinees a une alimentation particuliere': 'epicerie',
  'ingredients pour vegetariens': 'frais',
  'tartinables vegetariens': 'frais',
  'cereales et biscuits infantiles': 'epicerie',
  'desserts infantiles': 'epicerie',
  'laits et boissons infantiles': 'epicerie',
  'petits pots sales et plats infantiles': 'epicerie',
  eaux: 'boissons',
  'feuilletees et autres entrees': 'frais',
  'pizzas, tartes et crepes salees': 'frais',
  'plats composes': 'frais',
  'salades composees et crudites': 'frais',
  sandwichs: 'frais',
  'autres matieres grasses': 'epicerie',
  'huiles de poissons': 'epicerie',
  margarines: 'cremerie',
  'biscuits aperitifs': 'epicerie',
  farines: 'epicerie',
  'pates a tarte': 'frais',
  'pates, riz et cereales': 'epicerie',
  'barres cerealieres': 'epicerie-sucree',
  'biscuits sucres': 'epicerie-sucree',
  'confiseries non chocolatees': 'epicerie-sucree',
  'confitures et assimiles': 'epicerie-sucree',
  'cereales de petit-dejeuner': 'epicerie-sucree',
  viennoiseries: 'boulangerie',
  'autres produits a base de viande': 'boucherie',
  'charcuteries et alternatives vegetales': 'charcuterie',
  'produits a base de poissons et produits de la mer': 'boucherie',
};

export function rayon(alimentNom, aliments) {
  const n = norm(alimentNom);
  if (!n) return 'autres';
  const sg = norm(aliments[alimentNom]?.sous_groupe);
  // herbes fraîches au rayon fruits et légumes, herbes séchées avec les épices
  if (sg === 'herbes') return /^ail, cru|frais|fraich/.test(n) ? 'fruits-legumes' : 'placard';
  if (sg === 'epices' || sg === 'sels') return 'placard';
  for (const [re, r] of PAR_NOM) if (re.test(n)) return r;
  if (PAR_SOUS_GROUPE[sg]) return PAR_SOUS_GROUPE[sg];
  if (/^sucre/.test(n)) return 'epicerie-sucree';
  return 'autres';
}

// Ce qu'on achète réellement (un jaune d'œuf s'achète en œufs).
function achat(ing) {
  const a = norm(ing.aliment || '');
  if (/^oeuf/.test(a)) {
    const n = ing.unite === 'pièce' ? ing.quantite : Math.ceil((ing.poids || 55) / 55);
    return { cle: 'oeufs', nom: 'Œufs', unite: 'pièce', quantite: n, poids: ing.poids };
  }
  const cle = ing.aliment ? `a:${ing.aliment}` : `n:${norm(ing.nom)}`;
  return { cle, nom: ing.nom, unite: ing.unite, quantite: ing.quantite, poids: ing.poids };
}

/**
 * repas : [{ recette, parts }] pour la semaine.
 * Renvoie les articles groupés par rayon.
 */
export function listeCourses(repas, aliments) {
  const items = new Map();
  for (const { recette, parts } of repas) {
    if (!recette) continue;
    const f = parts / Math.max(1, recette.portions || 1);
    for (const ing of recette.ingredients || []) {
      if (estEau(ing)) continue;
      const a = achat(ing);
      let it = items.get(a.cle);
      if (!it) {
        it = { cle: a.cle, noms: new Map(), unites: new Map(), poids: 0, poidsConnu: true, recettes: new Set(), rayon: rayon(ing.aliment || ing.nom, aliments) };
        items.set(a.cle, it);
      }
      it.noms.set(a.nom, (it.noms.get(a.nom) || 0) + 1);
      if (a.quantite != null) it.unites.set(a.unite, (it.unites.get(a.unite) || 0) + a.quantite * f);
      if (a.poids != null) it.poids += a.poids * f;
      else it.poidsConnu = false;
      it.recettes.add(recette.nom);
    }
  }
  const res = [];
  for (const it of items.values()) {
    const nom = [...it.noms.entries()].sort((x, y) => y[1] - x[1])[0][0];
    let qte;
    if (it.unites.size === 1) {
      const [unite, val] = [...it.unites.entries()][0];
      // on n'achète pas 1,7 poivron : on arrondit les pièces au-dessus
      qte = { unite, val: unite === 'pièce' ? Math.max(1, Math.ceil(val - 0.05)) : val };
    } else if (it.poids > 0) {
      qte = { unite: 'g', val: it.poids, approx: true };
    } else {
      qte = null;
    }
    res.push({ cle: it.cle, nom, qte, rayon: it.rayon, recettes: [...it.recettes] });
  }
  res.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  return res;
}
