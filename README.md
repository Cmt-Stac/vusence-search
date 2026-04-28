# Vusence Search

Application web autonome de veille d appels d offres, concue pour un usage personnel.

## Stack

- Next.js (App Router)
- API Routes (backend integre)
- Donnees locales mock + mode source reelle configurable

## Fonctionnalites V1

- Dashboard de suivi des opportunites
- Calcul automatique de score par mots-cles
- Classification automatique en 2 categories metier
- Filtres par score, categorie, date et budget
- Affichage distance simulee
- Actions utilisateur: favori, ignorer, envoyer vers Devis (simulation uniquement)
- Bouton Actualiser pour recharger les donnees mock
- Persistance locale JSON des favoris/ignores

## Persistance locale

- Fichier: src/data/user-state.json
- API: GET/POST /api/state
- Portee: locale au projet Vusence Search

## Preparation V2 (sans connexion active)

- API: POST /api/devis/send
- Couche de connecteur: src/lib/devis-connector.ts
- Mode par defaut: mock (retourne "Fonction a venir")
- Aucun appel externe n est effectue

## V2 Source reelle (optionnel)

Le projet peut consommer une source reelle sans scraping via l API interne /api/tenders.

Variables a definir dans .env.local:

TENDERS_SOURCE_MODE=remote
TENDERS_REMOTE_URL=https://votre-source-officielle/api/tenders
TENDERS_REMOTE_TOKEN=optionnel

Si la source distante est indisponible ou invalide, l application bascule automatiquement en mode mock.

Formats acceptes pour la source distante:

- JSON array direct
- ou objet JSON contenant un tableau dans data, items, results ou value

Champs reconnus par ligne (mapping tolerant):

- id/reference/ref/numero/uid
- title/titre/name/objet
- description/resume/summary/details
- city/ville/location/commune
- budget/amount/montant/estimatedValue
- publicationDate/date/published_at/publishedAt
- keywords/tags/mots_cles/motcles

Exemple minimal d element JSON:

{
	"id": "AO-2026-0001",
	"title": "Mission BIM et scan 3D",
	"description": "Releve et modelisation 3D",
	"city": "Lyon",
	"budget": 25000,
	"publicationDate": "2026-04-28",
	"keywords": ["BIM", "scan 3D"]
}

## Lancer en local

1. Installer les dependances

npm install

2. Lancer en developpement

npm run dev

3. Ouvrir

http://localhost:3000

## Option mot de passe

L application peut etre protegee avec un mot de passe simple.

Ajouter dans un fichier .env.local:

NEXT_PUBLIC_APP_PASSWORD=votre_mot_de_passe

Si la variable est absente, acces direct.

## Build production

npm run build

## Deploiement Vercel

Le projet est pret pour Vercel.

Exemple de commandes:

vercel
vercel --prod

Pour lier a un projet Vercel existant:

vercel link --project project-jtgf9

Important:
- Aucun scraping
- Aucune API externe
- Aucune connexion a Vusence Devis (bouton simule uniquement)
