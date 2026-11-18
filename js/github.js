// Accès au dépôt privé de données via l'API GitHub (contenus de fichiers).

const API = 'https://api.github.com';

export class ErreurGitHub extends Error {
  constructor(message, { statut = 0, conflit = false, reseau = false } = {}) {
    super(message);
    this.statut = statut;
    this.conflit = conflit;
    this.reseau = reseau;
  }
}

const enc = new TextEncoder();

// SHA d'un blob git : sha1("blob <taille>\0<contenu>")
export async function shaBlob(texte) {
  const corps = enc.encode(texte);
  const tete = enc.encode(`blob ${corps.length}\0`);
  const tout = new Uint8Array(tete.length + corps.length);
  tout.set(tete);
  tout.set(corps, tete.length);
  const h = await crypto.subtle.digest('SHA-1', tout);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function base64(texte) {
  return base64Octets(enc.encode(texte));
}

function base64Octets(octets) {
  let bin = '';
  for (let i = 0; i < octets.length; i += 0x8000) bin += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(bin);
}

function message(statut) {
  if (statut === 401) return 'La clé d’accès est refusée ou a expiré.';
  if (statut === 403) return 'GitHub refuse l’accès : vérifie que la clé a le droit « Contents : Read and write » sur le dépôt.';
  if (statut === 404) return 'Dépôt introuvable : vérifie son nom et que la clé y a accès.';
  return `GitHub a répondu avec une erreur (${statut}).`;
}

export class Depot {
  constructor({ owner, repo, token, branche = 'main' }) {
    this.owner = owner;
    this.repo = repo;
    this.token = token;
    this.branche = branche;
  }

  entetes(extra = {}) {
    return {
      Authorization: `Bearer ${this.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...extra,
    };
  }

  url(chemin) {
    const c = chemin.split('/').map(encodeURIComponent).join('/');
    return `${API}/repos/${this.owner}/${this.repo}/contents/${c}`;
  }

  async appel(url, opts) {
    try {
      return await fetch(url, opts);
    } catch (e) {
      const horsLigne = navigator.onLine === false;
      const detail = e && e.message ? ` (${e.message})` : '';
      throw new ErreurGitHub(horsLigne ? 'Pas de connexion à internet.' : `Impossible de joindre GitHub${detail}.`, { reseau: true });
    }
  }

  // Vérifie la clé et les droits d'écriture.
  async verifier() {
    const r = await this.appel(`${API}/repos/${this.owner}/${this.repo}?t=${Date.now()}`, { headers: this.entetes({ Accept: 'application/vnd.github+json' }) });
    if (!r.ok) throw new ErreurGitHub(message(r.status), { statut: r.status });
    const j = await r.json();
    if (j.permissions && !j.permissions.push) throw new ErreurGitHub('La clé permet de lire le dépôt mais pas d’y écrire.', { statut: 403 });
    return j;
  }

  // Lit un fichier : { texte, sha } ou { texte: null } s'il n'existe pas.
  async lire(chemin) {
    const r = await this.appel(`${this.url(chemin)}?ref=${encodeURIComponent(this.branche)}&t=${Date.now()}`, {
      headers: this.entetes({ Accept: 'application/vnd.github.raw+json' }),
    });
    if (r.status === 404) return { texte: null, sha: null };
    if (!r.ok) throw new ErreurGitHub(message(r.status), { statut: r.status });
    const texte = await r.text();
    return { texte, sha: await shaBlob(texte) };
  }

  // Lit un fichier binaire (photo) : Blob, ou null s'il n'existe pas.
  async lireBinaire(chemin) {
    const r = await this.appel(`${this.url(chemin)}?ref=${encodeURIComponent(this.branche)}`, {
      headers: this.entetes({ Accept: 'application/vnd.github.raw+json' }),
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new ErreurGitHub(message(r.status), { statut: r.status });
    return r.blob();
  }

  // Crée un fichier binaire (nouvelle photo).
  async creerBinaire(chemin, octets, msg) {
    const r = await this.appel(this.url(chemin), {
      method: 'PUT',
      headers: this.entetes({ Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }),
      body: JSON.stringify({ message: msg, content: base64Octets(octets), branch: this.branche }),
    });
    if (!r.ok) throw new ErreurGitHub(message(r.status), { statut: r.status });
  }

  // Écrit un fichier ; échoue avec conflit=true si le fichier a changé depuis la lecture.
  async ecrire(chemin, texte, sha, msg) {
    const corps = { message: msg, content: base64(texte), branch: this.branche };
    if (sha) corps.sha = sha;
    const r = await this.appel(this.url(chemin), {
      method: 'PUT',
      headers: this.entetes({ Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }),
      body: JSON.stringify(corps),
    });
    if (r.status === 409 || r.status === 422) throw new ErreurGitHub('Conflit', { statut: r.status, conflit: true });
    if (!r.ok) throw new ErreurGitHub(message(r.status), { statut: r.status });
    const j = await r.json();
    return j.content?.sha || (await shaBlob(texte));
  }
}
