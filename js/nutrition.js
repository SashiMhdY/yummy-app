// Macros des recettes et liste de courses.
import { norm } from './util.js';

export const MACROS = [
  ['kcal', 'kcal', ''],
  ['proteines', 'protéines', 'g'],
  ['glucides', 'glucides', 'g'],
  ['lipides', 'lipides', 'g'],
];

export function macrosRecette(recette, aliments) {
  const t = { kcal: 0, proteines: 0, glucides: 0, lipides: 0, manquants: [] };
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
  }
  return t;
}

export function parPart(recette, aliments) {
  const t = macrosRecette(recette, aliments);
  const p = Math.max(1, recette.portions || 1);
  return { kcal: t.kcal / p, proteines: t.proteines / p, glucides: t.glucides / p, lipides: t.lipides / p, manquants: t.manquants };
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
  [/feuilletee|pate brisee|pate sablee|pate a pizza|galette de sarrasin|levure de boulanger/, 'frais'],
  [/^oeuf/, 'cremerie'],
  [/farine|fecule|amidon|flocon|semoule|couscous|levure chimique/, 'epicerie'],
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
  'cremes et specialites a base de creme': 'cremerie',
  laits: 'cremerie',
  'produits laitiers frais et assimiles': 'cremerie',
  beurres: 'cremerie',
  'pains et assimiles': 'boulangerie',
  'chocolats et produits a base de chocolat': 'epicerie-sucree',
  'miels et assimiles': 'epicerie-sucree',
  'gateaux et patisseries': 'epicerie-sucree',
  'sucres, miels et assimiles': 'epicerie-sucree',
  'boisson alcoolisees': 'boissons',
  'boissons alcoolisees': 'boissons',
  'boissons sans alcool': 'boissons',
};

export function rayon(alimentNom, aliments) {
  const n = norm(alimentNom);
  if (!n) return 'autres';
  for (const [re, r] of PAR_NOM) if (re.test(n)) return r;
  const sg = norm(aliments[alimentNom]?.sous_groupe);
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
