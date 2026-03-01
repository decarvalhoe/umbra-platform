"""umbra-payment-service - Service de paiement, monétisation et système gacha."""

from __future__ import annotations

import os
import random
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Dict, List, Optional

from flask import Flask, jsonify, request
from flask_cors import CORS


# ----------------------------------------------------------------------------
# Modèles métiers
# ----------------------------------------------------------------------------


def _to_decimal(value: Any) -> Decimal:
    """Convertit une valeur en :class:`~decimal.Decimal` avec deux décimales."""

    if isinstance(value, Decimal):  # Accept déjà décimal
        decimal_value = value
    else:
        try:
            decimal_value = Decimal(str(value))
        except (InvalidOperation, ValueError, TypeError) as exc:  # pragma: no cover - defensive
            raise ValueError("Montant invalide") from exc

    quantized = decimal_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if quantized < Decimal("0.00"):
        raise ValueError("Le montant doit être positif")
    return quantized


@dataclass
class Wallet:
    """Représente le portefeuille d'un utilisateur."""

    user_id: str
    balance: Decimal = Decimal("0.00")
    currency: str = "UMBC"  # Umbra Coins

    def as_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "balance": float(self.balance),
            "currency": self.currency,
        }


@dataclass
class Transaction:
    """Historique d'une opération sur un portefeuille."""

    id: str
    user_id: str
    type: str
    amount: Decimal
    balance_after: Decimal
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def as_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type,
            "amount": float(self.amount),
            "balance_after": float(self.balance_after),
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
        }


class PaymentError(Exception):
    """Erreur générique du service de paiement."""


class InsufficientFundsError(PaymentError):
    """Levée lorsqu'un portefeuille n'a pas assez de fonds."""


class PaymentStore:
    """Stockage mémoire pour les portefeuilles et transactions."""

    def __init__(self) -> None:
        self._wallets: Dict[str, Wallet] = {}
        self._transactions: Dict[str, List[Transaction]] = {}

    # -- Gestion des portefeuilles -------------------------------------------------
    def get_wallet(self, user_id: str) -> Wallet:
        if user_id not in self._wallets:
            self._wallets[user_id] = Wallet(user_id=user_id)
        return self._wallets[user_id]

    def _record_transaction(self, transaction: Transaction) -> None:
        self._transactions.setdefault(transaction.user_id, []).append(transaction)

    def top_up(
        self,
        user_id: str,
        amount: Decimal,
        source: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Transaction:
        wallet = self.get_wallet(user_id)
        wallet.balance += amount

        transaction = Transaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            type="topup",
            amount=amount,
            balance_after=wallet.balance,
            metadata={"source": source, **(metadata or {})} if source or metadata else metadata or {},
        )
        self._record_transaction(transaction)
        return transaction

    def spend(
        self,
        user_id: str,
        amount: Decimal,
        reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Transaction:
        wallet = self.get_wallet(user_id)
        if wallet.balance < amount:
            raise InsufficientFundsError("Fonds insuffisants pour cette opération")

        wallet.balance -= amount

        transaction = Transaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            type="spend",
            amount=amount,
            balance_after=wallet.balance,
            metadata={"reason": reason, **(metadata or {})} if reason or metadata else metadata or {},
        )
        self._record_transaction(transaction)
        return transaction

    def list_transactions(self, user_id: str) -> List[Transaction]:
        return list(self._transactions.get(user_id, []))


# ----------------------------------------------------------------------------
# Configuration des pools Gacha
# ----------------------------------------------------------------------------


def _default_gacha_pools() -> Dict[str, Dict[str, Any]]:
    return {
        "standard": {
            "cost": Decimal("10.00"),
            "items": [
                {"name": "Bague de Cuivre", "rarity": "common", "weight": 70},
                {"name": "Amulette d'Argent", "rarity": "rare", "weight": 25},
                {"name": "Lame d'Ombre", "rarity": "legendary", "weight": 5},
            ],
        },
        "premium": {
            "cost": Decimal("30.00"),
            "items": [
                {"name": "Cristal Azur", "rarity": "rare", "weight": 60},
                {"name": "Relique Ancienne", "rarity": "epic", "weight": 30},
                {"name": "Couronne du Néant", "rarity": "mythic", "weight": 10},
            ],
        },
    }


def _serialise_pool(name: str, pool: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "name": name,
        "cost": float(pool["cost"]),
        "items": [
            {"name": item["name"], "rarity": item["rarity"], "weight": item["weight"]}
            for item in pool["items"]
        ],
    }


# ----------------------------------------------------------------------------
# Application Flask
# ----------------------------------------------------------------------------


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    # Configuration
    app.config["DEBUG"] = os.getenv("FLASK_DEBUG", "0") == "1"
    app.config.setdefault("GACHA_POOLS", _default_gacha_pools())
    app.config.setdefault("PAYMENT_STORE", PaymentStore())

    seed = os.getenv("GACHA_RANDOM_SEED")
    rng = random.Random(int(seed)) if seed is not None else random.Random()
    app.config.setdefault("GACHA_RANDOM", rng)

    # Health check endpoint
    @app.route("/health")
    def health():
        return _json_success(
            message="Service en bonne santé",
            data={"status": "healthy", "service": "umbra-payment-service"},
        )

    # ------------------------------------------------------------------
    # Portefeuilles
    # ------------------------------------------------------------------
    @app.route("/wallets/<string:user_id>", methods=["GET"])
    def get_wallet_endpoint(user_id: str):
        store: PaymentStore = app.config["PAYMENT_STORE"]
        wallet = store.get_wallet(user_id)
        transactions = [tx.as_dict() for tx in store.list_transactions(user_id)]
        return _json_success(
            message="Portefeuille récupéré",
            data={"wallet": wallet.as_dict(), "transactions": transactions},
        )

    @app.route("/wallets/<string:user_id>/topup", methods=["POST"])
    def wallet_top_up(user_id: str):
        payload = request.get_json(silent=True) or {}
        amount = payload.get("amount")
        source = payload.get("source")
        metadata = payload.get("metadata")

        try:
            decimal_amount = _to_decimal(amount)
        except ValueError as exc:
            return _json_error("Montant invalide", str(exc), status=400)

        store: PaymentStore = app.config["PAYMENT_STORE"]
        transaction = store.top_up(user_id, decimal_amount, source=source, metadata=metadata)
        wallet = store.get_wallet(user_id)
        return _json_success(
            message="Portefeuille crédité",
            data={
                "wallet": wallet.as_dict(),
                "transaction": transaction.as_dict(),
            },
        )

    @app.route("/wallets/<string:user_id>/spend", methods=["POST"])
    def wallet_spend(user_id: str):
        payload = request.get_json(silent=True) or {}
        amount = payload.get("amount")
        reason = payload.get("reason")
        metadata = payload.get("metadata")

        try:
            decimal_amount = _to_decimal(amount)
        except ValueError as exc:
            return _json_error("Montant invalide", str(exc), status=400)

        store: PaymentStore = app.config["PAYMENT_STORE"]
        try:
            transaction = store.spend(user_id, decimal_amount, reason=reason, metadata=metadata)
        except InsufficientFundsError as exc:
            return _json_error("Fonds insuffisants", str(exc), status=400)

        wallet = store.get_wallet(user_id)
        return _json_success(
            message="Paiement effectué",
            data={
                "wallet": wallet.as_dict(),
                "transaction": transaction.as_dict(),
            },
        )

    @app.route("/wallets/<string:user_id>/transactions", methods=["GET"])
    def wallet_transactions(user_id: str):
        store: PaymentStore = app.config["PAYMENT_STORE"]
        transactions = [tx.as_dict() for tx in store.list_transactions(user_id)]
        return _json_success(
            message="Transactions récupérées",
            data={"transactions": transactions},
        )

    # ------------------------------------------------------------------
    # Gacha
    # ------------------------------------------------------------------
    @app.route("/gacha/pools", methods=["GET"])
    def list_pools():
        pools = app.config["GACHA_POOLS"]
        serialised = [_serialise_pool(name, pool) for name, pool in pools.items()]
        return _json_success(message="Pools disponibles", data={"pools": serialised})

    @app.route("/gacha/draw", methods=["POST"])
    def draw_items():
        payload = request.get_json(silent=True) or {}
        user_id = payload.get("user_id")
        pool_name = payload.get("pool", "standard")
        draws = payload.get("draws", 1)
        seed = payload.get("seed")

        if not user_id:
            return _json_error("Paramètre manquant", "user_id est requis", status=400)

        try:
            draws_count = int(draws)
        except (TypeError, ValueError):
            return _json_error("Paramètre invalide", "draws doit être un entier", status=400)

        if draws_count <= 0 or draws_count > 50:
            return _json_error("Paramètre invalide", "draws doit être compris entre 1 et 50", status=400)

        pools: Dict[str, Dict[str, Any]] = app.config["GACHA_POOLS"]
        if pool_name not in pools:
            return _json_error("Pool inconnu", f"Le pool '{pool_name}' n'existe pas", status=404)

        pool = pools[pool_name]
        cost = pool["cost"] * draws_count

        store: PaymentStore = app.config["PAYMENT_STORE"]
        try:
            store.spend(user_id, cost, reason=f"gacha:{pool_name}")
        except InsufficientFundsError as exc:
            return _json_error("Fonds insuffisants", str(exc), status=400)

        rng = random.Random(int(seed)) if seed is not None else app.config["GACHA_RANDOM"]
        results = _perform_draws(pool, draws_count, rng)

        wallet = store.get_wallet(user_id)
        return _json_success(
            message="Tirage effectué",
            data={
                "pool": pool_name,
                "draws": draws_count,
                "items": results,
                "remaining_balance": float(wallet.balance),
            },
        )

    return app


def _perform_draws(pool: Dict[str, Any], draws: int, rng: random.Random) -> List[Dict[str, Any]]:
    items = pool["items"]
    weights = [item["weight"] for item in items]
    choices = rng.choices(items, weights=weights, k=draws)
    return [{"name": choice["name"], "rarity": choice["rarity"]} for choice in choices]


def _json_success(message: str, data: Optional[Dict[str, Any]] = None, status: int = 200):
    response = {
        "success": True,
        "data": data or {},
        "message": message,
        "error": None,
        "meta": None,
    }
    return jsonify(response), status


def _json_error(title: str, detail: str, status: int = 400):
    response = {
        "success": False,
        "data": None,
        "message": title,
        "error": {"detail": detail},
        "meta": None,
    }
    return jsonify(response), status


if __name__ == "__main__":
    application = create_app()
    port = int(os.getenv("PORT", "5003"))
    application.run(host="0.0.0.0", port=port, debug=True)
