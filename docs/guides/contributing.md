# Guide de Contribution - Project Umbra

## 1. Préparation
- Forker le repository ciblé (service ou documentation).
- Configurer `pre-commit` et les linters mentionnés dans le repo.
- Lire les spécifications liées à l'issue assignée.

## 2. Workflow Git
1. Créer une branche `feature/<issue-id>-<slug>`.
2. Commits atomiques et message au format Conventional Commits (`feat:`, `fix:`, `docs:`...).
3. Rebase sur `develop` avant d'ouvrir la PR.

## 3. Standards PR
- Décrire le contexte et la solution.
- Ajouter captures ou logs de tests si pertinent.
- Mettre à jour la documentation affectée.
- Vérifier que tous les checks CI passent.

## 4. Revue
- Utiliser les suggestions GitHub pour proposer des modifications.
- Exiger au moins 1 approbation d'un mainteneur.
- Résoudre les conversations avant le merge.

## 5. Post-merge
- Supprimer la branche feature.
- Vérifier les déploiements automatiques.
- Créer une issue de suivi si des améliorations restent ouvertes.
