# Diagrammes d'Architecture

Ce répertoire centralise les diagrammes système du projet Umbra.

## Contenu attendu
- Diagrammes de séquence pour les flux critiques (authentification, achats, runs multijoueur).
- Diagrammes C4 (niveau système et conteneur) pour chaque service.
- Diagrammes d'infrastructure (déploiement Kubernetes, flux réseau, topologie monitoring).

## Convention
- Format source au format [PlantUML](https://plantuml.com/) (`.puml`) pour la traçabilité.
- Export PNG/SVG générés via pipeline CI (`make diagrams`).
- Nommer les fichiers `service-contexte.puml`, `service-container.puml`, etc.

## Contribution
1. Ajouter le fichier `.puml` et l'export `.png`/`.svg` correspondant.
2. Mettre à jour cette documentation avec un aperçu du diagramme.
3. Soumettre une PR avec la mention `diagram` dans le titre.
