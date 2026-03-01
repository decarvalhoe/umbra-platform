# Standards de Code - Project Umbra

## Python
- Formatage avec `black` (line-length 100) et linting `flake8`.
- Typage strict (`mypy --strict`).
- Tests unitaires via `pytest`, couverture cible 85%.
- Docstrings Google Style, validation via `pydocstyle`.

## TypeScript / React
- Formatage `prettier` (printWidth 100) et linting `eslint` (config Airbnb).
- Hooks React respectant la `Rules of Hooks`.
- Tests unitaires `vitest` + `testing-library`.
- Storybook obligatoire pour chaque composant UI.

## Infrastructure (IaC)
- Terraform formaté (`terraform fmt`) et validé (`terraform validate`).
- Revue manuelle sur les modifications de sécurité (SG, IAM, Secrets).
- Conventions de nommage : `umbra-<service>-<env>-<resource>`.

## Git
- Messages Conventional Commits.
- PRs < 500 lignes modifiées quand possible.
- Branches supprimées après merge.
