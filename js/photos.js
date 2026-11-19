// Photos des plats : stockées dans le dépôt privé, lues avec la clé, gardées en cache sur l'appareil.
import { useState, useEffect } from './vendor/htm-preact.js';
import { store } from './store.js';
import { slug } from './util.js';

const memoire = new Map(); // chemin -> URL d'objet
const enCours = new Map(); // chemin -> Promise
const CACHE = 'yummy-photos-v1';
const cleCache = (chemin) => `${location.origin}/__photos__/${chemin}`;

async function depuisCache(chemin) {
  try {
    const c = await caches.open(CACHE);
    const r = await c.match(cleCache(chemin));
    return r ? await r.blob() : null;
  } catch {
    return null;
  }
}

async function versCache(chemin, blob) {
  try {
    const c = await caches.open(CACHE);
    await c.put(cleCache(chemin), new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } }));
  } catch {
    /* pas de cache disponible : la photo sera relue au prochain affichage */
  }
}

function charger(chemin) {
  if (memoire.has(chemin)) return Promise.resolve(memoire.get(chemin));
  if (enCours.has(chemin)) return enCours.get(chemin);
  const p = (async () => {
    let blob = await depuisCache(chemin);
    if (!blob && store.connecte) {
      blob = await store.depot().lireBinaire(chemin);
      if (blob) await versCache(chemin, blob);
    }
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    memoire.set(chemin, url);
    return url;
  })().finally(() => enCours.delete(chemin));
  enCours.set(chemin, p);
  return p;
}

export function usePhoto(chemin) {
  const [url, setUrl] = useState(() => (chemin ? memoire.get(chemin) || null : null));
  const [echec, setEchec] = useState(false);
  useEffect(() => {
    if (!chemin) return;
    let actif = true;
    setEchec(false);
    if (memoire.has(chemin)) setUrl(memoire.get(chemin));
    else
      charger(chemin)
        .then((u) => actif && (u ? setUrl(u) : setEchec(true)))
        .catch(() => actif && setEchec(true));
    return () => {
      actif = false;
    };
  }, [chemin]);
  return { url, echec };
}

// ---------- Envoi d'une photo prise ou choisie sur l'appareil ----------
function lireImage(fichier) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => res({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error('Ce fichier n’est pas une image lisible.'));
    };
    img.src = url;
  });
}

function versJpeg(img, largeur, hauteur, sx, sy, sl, sh) {
  const c = document.createElement('canvas');
  c.width = largeur;
  c.height = hauteur;
  c.getContext('2d').drawImage(img, sx, sy, sl, sh, 0, 0, largeur, hauteur);
  return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.8));
}

// Vignette carrée pour les plats ; pour une couverture de livre, image entière réduite (pas de recadrage).
async function preparer(fichier, { carre = true } = {}) {
  const { img, url } = await lireImage(fichier);
  try {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const k = Math.min(1, 1400 / Math.max(w, h));
    const grande = await versJpeg(img, Math.round(w * k), Math.round(h * k), 0, 0, w, h);
    let mini;
    if (carre) {
      const cote = Math.min(w, h);
      mini = await versJpeg(img, 320, 320, (w - cote) / 2, (h - cote) / 2, cote, cote);
    } else {
      const km = Math.min(1, 320 / Math.max(w, h));
      mini = await versJpeg(img, Math.round(w * km), Math.round(h * km), 0, 0, w, h);
    }
    return { grande, mini };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function envoyer(base, fichier, message, options) {
  if (!navigator.onLine) throw new Error('Il faut du réseau pour envoyer une photo.');
  const { grande, mini } = await preparer(fichier, options);
  const marque = Date.now().toString(36);
  const chemins = { grande: `${base}-${marque}.jpg`, mini: `${base}-${marque}-mini.jpg` };
  const depot = store.depot();
  for (const [k, blob] of [['grande', grande], ['mini', mini]]) {
    const octets = new Uint8Array(await blob.arrayBuffer());
    await depot.creerBinaire(chemins[k], octets, message);
    await versCache(chemins[k], blob);
    memoire.set(chemins[k], URL.createObjectURL(blob));
  }
  return chemins;
}

export async function envoyerPhoto(recette, fichier) {
  const photo = await envoyer(`photos/${recette.id}`, fichier, `Photos : ${recette.nom}`);
  store.faire('recettes', 'recette.photo', { id: recette.id, photo });
}

export async function envoyerCouverture(livre, fichier) {
  const photo = await envoyer(`photos/livres/${slug(livre) || 'livre'}`, fichier, `Photos : couverture de ${livre}`, { carre: false });
  store.faire('recettes', 'livre.photo', { livre, photo });
}
