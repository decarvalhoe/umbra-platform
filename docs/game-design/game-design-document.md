# Game Design Document - Project Umbra

## Vision
Créer un ARPG dark fantasy mêlant rogue-lite et mécaniques idle pour offrir une progression continue et rejouable.

## Pilliers
- **Combat viscéral** : compétences à exécuter avec timing, synergies élémentaires et combos.
- **Exploration roguelite** : niveaux générés procéduralement, événements narratifs et choix à conséquences.
- **Progression idle** : ressources accumulées hors ligne, ateliers automatiques et familiers récolteurs.
- **Multijoueur asynchrone** : clans, défis hebdomadaires, fantômes des autres joueurs.

## Boucle de gameplay
1. Préparation du build (talents, équipement, cartes de runes).
2. Run rogue-lite avec salles aléatoires et mini-boss.
3. Extraction ou mort → récompenses converties en ressources meta.
4. Dépense des ressources pour améliorer la base, débloquer classes, optimiser familiers.

## Plateformes
- Client web (React + Phaser).
- Clients mobiles via Capacitor.
- Synchronisation cross-platform via Cloud Profile Service.

## Prochaines étapes
- Prototyper 3 classes de départ.
- Définir les statistiques des ennemis de tier 1.
- Finaliser la progression meta (arbres de talents). 
