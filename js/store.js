// État de l'app, cache local et synchronisation avec le dépôt de données.
// Chaque modification est une « opération » rejouable : elle est appliquée tout de suite
// à l'écran, mise en file d'attente, puis envoyée à GitHub (rejouée sur la dernière
// version du fichier en cas de modification simultanée sur un autre appareil).
import { Depot, ErreurGitHub } from './github.js';

const CHEMINS = { recettes: 'data/recettes.json', planning: 'data/planning.json', courses: 'data/courses.json' };
const VIDES = {
  recettes: () => ({ version: 1, recettes: [] }),
  planning: () => ({ version: 1, repas: {} }),
  courses: () => ({ version: 1, coches: {}, extras: {} }),
};
const CONFIG_DEFAUT = { owner: 'SashiMhdY', repo: 'yummy', token: '', parts: null };

const LS = {
  get(k, d) {
    try {
      const v = localStorage.getItem(`yummy.${k}`);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      if (v === undefined) localStorage.removeItem(`yummy.${k}`);
      else localStorage.setItem(`yummy.${k}`, JSON.stringify(v));
    } catch {
      /* stockage plein ou indisponible : l'app continue en mémoire */
    }
  },
};

const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------- Opérations ----------
const OPS = {
  planning: {
    'repas.ajouter'(d, { date, moment, entree }) {
      const j = (d.repas[date] ||= {});
      const l = (j[moment] ||= []);
      if (!l.some((e) => e.id === entree.id)) l.push(entree);
    },
    'repas.retirer'(d, { date, moment, id }) {
      const l = d.repas[date]?.[moment];
      if (!l) return;
      d.repas[date][moment] = l.filter((e) => e.id !== id);
      if (!d.repas[date][moment].length) delete d.repas[date][moment];
      if (!Object.keys(d.repas[date]).length) delete d.repas[date];
    },
    'repas.parts'(d, { date, moment, id, parts }) {
      const e = d.repas[date]?.[moment]?.find((x) => x.id === id);
      if (e) e.p = parts;
    },
  },
  courses: {
    coche(d, { semaine, cle, val }) {
      const c = (d.coches[semaine] ||= {});
      if (val) c[cle] = true;
      else delete c[cle];
      if (!Object.keys(c).length) delete d.coches[semaine];
    },
    'extra.ajouter'(d, { semaine, item }) {
      const l = (d.extras[semaine] ||= []);
      if (!l.some((x) => x.id === item.id)) l.push(item);
    },
    'extra.retirer'(d, { semaine, id }) {
      d.extras[semaine] = (d.extras[semaine] || []).filter((x) => x.id !== id);
      if (!d.extras[semaine].length) delete d.extras[semaine];
      if (d.coches[semaine]) delete d.coches[semaine][`x:${id}`];
    },
    'coches.vider'(d, { semaine }) {
      delete d.coches[semaine];
    },
  },
  recettes: {
    'recette.enregistrer'(d, { recette }) {
      const i = d.recettes.findIndex((r) => r.id === recette.id);
      if (i >= 0) d.recettes[i] = recette;
      else d.recettes.push(recette);
      d.recettes.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    },
    'recette.supprimer'(d, { id }) {
      d.recettes = d.recettes.filter((r) => r.id !== id);
    },
  },
};

const MESSAGES = {
  'repas.ajouter': 'Semainier : repas ajouté',
  'repas.retirer': 'Semainier : repas retiré',
  'repas.parts': 'Semainier : parts modifiées',
  coche: 'Courses : article coché',
  'extra.ajouter': 'Courses : article ajouté',
  'extra.retirer': 'Courses : article retiré',
  'coches.vider': 'Courses : liste remise à zéro',
  'recette.enregistrer': 'Recettes : recette enregistrée',
  'recette.supprimer': 'Recettes : recette supprimée',
};

function appliquer(doc, data, ops) {
  const d = clone(data);
  for (const o of ops) OPS[doc][o.type]?.(d, o);
  return d;
}

// ---------- Store ----------
const abonnes = new Set();
let notifPrevue = false;
function notifier() {
  if (notifPrevue) return;
  notifPrevue = true;
  queueMicrotask(() => {
    notifPrevue = false;
    abonnes.forEach((f) => f());
  });
}

export const store = {
  config: { ...CONFIG_DEFAUT, ...LS.get('config', {}) },
  serveur: {}, // { doc: { data, sha } }
  local: {}, // données affichées = serveur + opérations en attente
  file: LS.get('file', []), // [{ doc, type, ...payload }]
  aliments: {},
  alimentsSource: '',
  sync: { etat: 'ok', message: '' }, // ok | envoi | attente | erreur
  charge: false,
  toast: null,
  majDisponible: false,

  abonner(f) {
    abonnes.add(f);
    return () => abonnes.delete(f);
  },

  get connecte() {
    return Boolean(this.config.token);
  },

  depot() {
    return new Depot(this.config);
  },

  recalculer(doc) {
    const base = this.serveur[doc]?.data || VIDES[doc]();
    const ops = this.file.filter((o) => o.doc === doc);
    this.local[doc] = ops.length ? appliquer(doc, base, ops) : base;
  },

  async init() {
    for (const doc of Object.keys(CHEMINS)) {
      const c = LS.get(`doc.${doc}`, null);
      if (c) this.serveur[doc] = c;
      this.recalculer(doc);
    }
    this.charge = Object.keys(CHEMINS).every((d) => this.serveur[d]);
    notifier();
    try {
      const r = await fetch('./data/aliments.json');
      const j = await r.json();
      this.aliments = j.aliments;
      this.alimentsSource = j.source;
      notifier();
    } catch {
      /* hors ligne au premier lancement : macros indisponibles */
    }
    if (this.connecte) {
      this.rafraichir();
      this.envoyer();
    }
    window.addEventListener('online', () => this.envoyer());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.connecte) {
        this.rafraichir();
        this.envoyer();
      }
    });
    setInterval(() => {
      if (document.visibilityState === 'visible' && this.connecte && !this.envoiEnCours) this.rafraichir(['planning', 'courses']);
    }, 45000);
  },

  async rafraichir(docs = Object.keys(CHEMINS)) {
    if (!this.connecte) return;
    const depot = this.depot();
    await Promise.all(
      docs.map(async (doc) => {
        try {
          const { texte, sha } = await depot.lire(CHEMINS[doc]);
          if (sha && this.serveur[doc]?.sha === sha) return;
          const data = texte ? JSON.parse(texte) : VIDES[doc]();
          this.serveur[doc] = { data, sha };
          LS.set(`doc.${doc}`, this.serveur[doc]);
          this.recalculer(doc);
        } catch (e) {
          this.erreur(e);
        }
      }),
    );
    this.charge = Object.keys(CHEMINS).every((d) => this.serveur[d]);
    if (this.sync.etat === 'erreur' && !this.file.length) this.sync = { etat: 'ok', message: '' };
    notifier();
  },

  erreur(e) {
    if (e instanceof ErreurGitHub && e.reseau) this.sync = { etat: 'attente', message: 'Hors ligne : les changements seront envoyés au retour du réseau.' };
    else this.sync = { etat: 'erreur', message: e.message || String(e) };
    notifier();
  },

  // Applique une opération tout de suite et la met en file d'envoi.
  faire(doc, type, payload) {
    this.file.push({ doc, type, ...payload });
    LS.set('file', this.file);
    this.recalculer(doc);
    notifier();
    clearTimeout(this._minuteur);
    this._minuteur = setTimeout(() => this.envoyer(), 600);
  },

  async envoyer() {
    if (this.envoiEnCours || !this.file.length || !this.connecte) return;
    this.envoiEnCours = true;
    this.sync = { etat: 'envoi', message: '' };
    notifier();
    const depot = this.depot();
    try {
      for (const doc of Object.keys(CHEMINS)) {
        const ops = this.file.filter((o) => o.doc === doc);
        if (!ops.length) continue;
        for (let essai = 0; ; essai++) {
          const { texte, sha } = await depot.lire(CHEMINS[doc]);
          const base = texte ? JSON.parse(texte) : VIDES[doc]();
          const data = appliquer(doc, base, ops);
          const sortie = `${JSON.stringify(data, null, 1)}\n`;
          const msg = ops.length === 1 ? MESSAGES[ops[0].type] : `${MESSAGES[ops[0].type]} (+${ops.length - 1})`;
          try {
            const nouveauSha = await depot.ecrire(CHEMINS[doc], sortie, sha, msg);
            this.serveur[doc] = { data, sha: nouveauSha };
            LS.set(`doc.${doc}`, this.serveur[doc]);
            this.file = this.file.filter((o) => !ops.includes(o));
            LS.set('file', this.file);
            this.recalculer(doc);
            break;
          } catch (e) {
            if (e.conflit && essai < 4) {
              await new Promise((r) => setTimeout(r, 400 + Math.random() * 800));
              continue;
            }
            throw e;
          }
        }
      }
      this.sync = { etat: 'ok', message: '' };
    } catch (e) {
      this.erreur(e);
    } finally {
      this.envoiEnCours = false;
      notifier();
    }
    if (this.file.length && this.sync.etat === 'ok') this.envoyer();
  },

  async connecter({ owner, repo, token }) {
    const config = { ...this.config, owner: owner.trim(), repo: repo.trim(), token: token.trim() };
    await new Depot(config).verifier();
    this.config = config;
    LS.set('config', config);
    this.sync = { etat: 'ok', message: '' };
    await this.rafraichir();
    this.envoyer();
  },

  reglerParts(parts) {
    this.config = { ...this.config, parts: parts || null };
    LS.set('config', this.config);
    notifier();
  },

  deconnecter() {
    this.config = { ...CONFIG_DEFAUT, owner: this.config.owner, repo: this.config.repo };
    LS.set('config', this.config);
    for (const doc of Object.keys(CHEMINS)) {
      LS.set(`doc.${doc}`, undefined);
      delete this.serveur[doc];
      this.recalculer(doc);
    }
    this.file = [];
    LS.set('file', []);
    this.charge = false;
    notifier();
  },

  afficher(message) {
    this.toast = { message, id: Date.now() };
    notifier();
    clearTimeout(this._toast);
    this._toast = setTimeout(() => {
      this.toast = null;
      notifier();
    }, 2600);
  },

  signalerMaj() {
    this.majDisponible = true;
    notifier();
  },
};

// Pour les tests
export const _interne = { OPS, appliquer, VIDES };
