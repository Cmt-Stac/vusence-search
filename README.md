# Vusence Search

Application web autonome de veille d appels d offres, concue pour un usage personnel.

## Stack

- Next.js (App Router)
- API Routes (backend integre)
- Donnees locales mock (aucune connexion externe)

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
