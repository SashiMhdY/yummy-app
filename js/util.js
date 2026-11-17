// Outils partagés : texte, dates, nombres.

export const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .trim();

export const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// ---------- Dates (heure locale) ----------
const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const lundi = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const j = (x.getDay() + 6) % 7; // lundi = 0
  return addDays(x, -j);
};
export const aujourdhui = () => toISO(new Date());

// Semaine ISO 8601
export function semaineISO(d) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const jour = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - jour);
  const debut = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  const num = Math.ceil(((x - debut) / 86400000 + 1) / 7);
  return { annee: x.getUTCFullYear(), num };
}
export const cleSemaine = (d) => {
  const { annee, num } = semaineISO(d);
  return `${annee}-S${pad(num)}`;
};

const fmt = (opts) => new Intl.DateTimeFormat('fr-FR', opts);
const fJourCourt = fmt({ weekday: 'short' });
const fJourLong = fmt({ weekday: 'long' });
const fMois = fmt({ month: 'long' });
const fJourMois = fmt({ day: 'numeric', month: 'long' });

export const jourCourt = (d) => fJourCourt.format(d); // « lun. »
export const jourLong = (d) => fJourLong.format(d); // « lundi »
export const jourMois = (d) => fJourMois.format(d); // « 17 novembre »

export function plageSemaine(debut) {
  const fin = addDays(debut, 6);
  if (debut.getMonth() === fin.getMonth()) return `du ${debut.getDate()} au ${fin.getDate()} ${fMois.format(fin)}`;
  return `du ${jourMois(debut)} au ${jourMois(fin)}`;
}

// ---------- Nombres ----------
const nf = (max) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: max });
const nf0 = nf(0);
const nf1 = nf(1);
export const nombre = (n, dec = 0) => (n == null || Number.isNaN(n) ? '' : (dec ? nf1 : nf0).format(n));

export function quantite(q, unite) {
  if (q == null || Number.isNaN(q)) return '';
  if (unite === 'g') {
    if (q >= 1000) return `${nf1.format(Math.round(q / 100) / 10)} kg`;
    return `${nf0.format(q < 20 ? Math.round(q * 2) / 2 : Math.round(q / 5) * 5)} g`;
  }
  if (unite === 'ml') {
    if (q >= 1000) return `${nf1.format(Math.round(q / 100) / 10)} l`;
    return `${nf0.format(Math.round(q / 5) * 5 || Math.round(q))} ml`;
  }
  const v = nf1.format(Math.round(q * 10) / 10);
  if (unite === 'pièce' || !unite) return v;
  return `${v} ${unite}`;
}

export function duree(min) {
  if (!min) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${pad(m)}` : `${h} h`;
}

export const pluriel = (n, un, plusieurs) => `${nombre(n)} ${n > 1 ? plusieurs : un}`;
