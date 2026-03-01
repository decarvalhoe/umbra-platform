# Payment Service - Documentation API

## Vue d'ensemble
Assure la boutique in-game, la gestion des devises et l'intégration avec les plateformes externes.

## Endpoints principaux
- `GET /api/payments/storefront` : Catalogue dynamique des offres.
- `POST /api/payments/orders` : Création d'un ordre d'achat.
- `POST /api/payments/orders/:order_id/confirm` : Confirmation de paiement.
- `POST /api/payments/orders/:order_id/cancel` : Annulation/refund.
- `GET /api/payments/wallet` : Solde des devises premium / soft.

## Intégrations
- Webhooks Stripe/Apple/Google traités via une file SQS.
- Signature HMAC pour valider les notifications entrantes.
- Support des promotions temporelles et des bundles dynamiques.

## Compliance
- Journalisation conforme PCI DSS (données sensibles tokenisées).
- Vérifications anti-fraude (velocity checks, carte bannie, heuristiques ML).
- Conformité RGPD : droit à l'oubli et anonymisation sur demande.

## Monitoring
- KPI : taux de conversion, valeur moyenne du panier, échecs de paiement.
- Alertes temps réel sur les taux d'erreur > 2%.
