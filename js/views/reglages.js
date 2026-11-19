import { html, useState } from '../vendor/htm-preact.js';
import { store } from '../store.js';
import { useStore, Plaque, Barre, Compteur } from '../ui.js';

export const VERSION = '1.2.0'; // garder le même numéro que CACHE dans sw.js

function FormConnexion({ bouton }) {
  const s = useStore();
  const [owner, setOwner] = useState(s.config.owner);
  const [repo, setRepo] = useState(s.config.repo);
  const [token, setToken] = useState('');
  const [etat, setEtat] = useState({ attente: false, erreur: '', ok: '' });
  const envoyer = async (e) => {
    e.preventDefault();
    if (!token.trim() && !s.config.token) {
      setEtat({ erreur: 'Colle la clé d’accès.' });
      return;
    }
    setEtat({ attente: true });
    try {
      await store.connecter({ owner, repo, token: token.trim() || s.config.token });
      setToken('');
      setEtat({ ok: `Connecté au dépôt ${owner}/${repo}.` });
    } catch (err) {
      setEtat({ erreur: err.message });
    }
  };
  return html`<form class="formulaire" onSubmit=${envoyer}>
    <label class="champ">
      <span>Clé d’accès</span>
      <input type="password" autocomplete="off" value=${token} onInput=${(e) => setToken(e.target.value)} placeholder=${s.config.token ? 'Clé enregistrée sur cet appareil' : 'github_pat_…'} />
    </label>
    <details class="avance">
      <summary>Dépôt des données</summary>
      <div class="grille-2">
        <label class="champ"><span>Compte GitHub</span><input value=${owner} onInput=${(e) => setOwner(e.target.value)} autocapitalize="off" /></label>
        <label class="champ"><span>Dépôt</span><input value=${repo} onInput=${(e) => setRepo(e.target.value)} autocapitalize="off" /></label>
      </div>
    </details>
    ${etat.erreur && html`<p class="erreurs" role="alert">${etat.erreur}</p>`}
    ${etat.ok && html`<p class="succes" role="status">${etat.ok}</p>`}
    <button class="btn btn-large" type="submit" disabled=${etat.attente}>${etat.attente ? 'Connexion…' : bouton}</button>
  </form>`;
}

export function Accueil() {
  return html`<main class="vue vue-accueil">
    <${Plaque} grande>Yummy<//>
    <p class="accroche">Le livre de recettes, le menu de la semaine et la liste de courses de la famille.</p>
    <p>Pour commencer sur cet appareil, colle la clé d’accès de la famille.</p>
    <${FormConnexion} bouton="Se connecter" />
  </main>`;
}

export function Reglages() {
  const s = useStore();
  const deconnecter = () => {
    if (confirm('Retirer la clé et les données de cet appareil ? Les données restent sur GitHub.')) store.deconnecter();
  };
  const etats = { ok: 'À jour', envoi: 'Envoi en cours', attente: 'En attente du réseau', erreur: 'En échec' };
  return html`<main class="vue">
    <${Barre} />
    <${Plaque}>Réglages<//>

    <section class="bloc">
      <h2>Synchronisation</h2>
      <p>${etats[s.sync.etat]}${s.file.length ? `, ${s.file.length} ${s.file.length > 1 ? 'changements' : 'changement'} à envoyer` : ''}.</p>
      ${s.sync.message && html`<p class=${s.sync.etat === 'erreur' ? 'erreurs' : 'aide'}>${s.sync.message}</p>`}
      <button class="btn btn-second" onClick=${() => { store.rafraichir(); store.envoyer(); }}>Synchroniser maintenant</button>
    </section>

    <section class="bloc">
      <h2>Parts par défaut</h2>
      <p class="aide">Nombre de parts proposé quand tu ajoutes un plat au menu. Sans réglage, c’est celui de la recette.</p>
      ${s.config.parts
        ? html`<div class="ligne-champ"><${Compteur} valeur=${s.config.parts} onChange=${(v) => store.reglerParts(v)} label="Parts par défaut" />
            <button class="btn-lien" onClick=${() => store.reglerParts(null)}>Utiliser celui de la recette</button></div>`
        : html`<button class="btn btn-second" onClick=${() => store.reglerParts(4)}>Fixer un nombre de parts</button>`}
    </section>

    <section class="bloc">
      <h2>Connexion</h2>
      <p class="aide">Dépôt ${s.config.owner}/${s.config.repo}. La clé reste sur cet appareil.</p>
      <${FormConnexion} bouton="Enregistrer la clé" />
      <p><button class="btn-danger" onClick=${deconnecter}>Oublier cet appareil</button></p>
    </section>

    <section class="bloc">
      <h2>À propos</h2>
      <p class="aide">${s.local.recettes.recettes.length} recettes. Valeurs nutritionnelles : ${s.alimentsSource || 'non chargées'} (${Object.keys(s.aliments).length} aliments). Version ${VERSION}.</p>
    </section>
  </main>`;
}
