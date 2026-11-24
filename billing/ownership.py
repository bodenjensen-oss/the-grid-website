"""Offline purchase-credit accounting. Its caller supplies trusted, settled payments."""
from contextlib import contextmanager
import sqlite3


def _positive(value):
    if type(value) is not int or not 0 < value <= 2**63 - 1:
        raise ValueError("Expected a positive integer amount in minor currency units")


class OwnershipLedger:
    """One offer per customer and product version. Both storefront links use the same key."""

    def __init__(self, db: sqlite3.Connection):
        self.db = db
        db.execute("PRAGMA foreign_keys = ON")
        db.executescript("""
            CREATE TABLE IF NOT EXISTS offers (
                id INTEGER PRIMARY KEY, customer TEXT NOT NULL, product TEXT NOT NULL,
                currency TEXT NOT NULL, price INTEGER NOT NULL CHECK(price > 0),
                paid_once INTEGER NOT NULL DEFAULT 0, UNIQUE(customer, product)
            );
            CREATE TABLE IF NOT EXISTS payments (
                id TEXT PRIMARY KEY NOT NULL, offer INTEGER NOT NULL REFERENCES offers(id),
                amount INTEGER NOT NULL CHECK(amount > 0)
            );
            CREATE TABLE IF NOT EXISTS refunds (
                id TEXT PRIMARY KEY NOT NULL, payment TEXT NOT NULL REFERENCES payments(id),
                amount INTEGER NOT NULL CHECK(amount > 0)
            );
        """)

    @contextmanager
    def _write(self):
        self.db.execute("BEGIN IMMEDIATE")
        with self.db:
            yield

    def open_offer(self, customer, product, currency, total):
        _positive(total)
        if not customer or not product or len(currency) != 3 or not currency.isascii() or not currency.isalpha() or currency != currency.upper():
            raise ValueError("Customer, product version and three-letter uppercase currency required")
        with self._write():
            self.db.execute("INSERT INTO offers(customer, product, currency, price) VALUES(?,?,?,?) "
                            "ON CONFLICT(customer, product) DO NOTHING", (customer, product, currency, total))
            if self.status(customer, product, currency)["price"] != total:
                raise ValueError("The agreed price is already recorded")

    def status(self, customer, product, currency):
        row = self.db.execute("""
            SELECT o.id, o.currency, o.price, o.paid_once,
                COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.offer=o.id),0) -
                COALESCE((SELECT SUM(r.amount) FROM refunds r JOIN payments p ON p.id=r.payment
                          WHERE p.offer=o.id),0)
            FROM offers o WHERE o.customer=? AND o.product=?
        """, (customer, product)).fetchone()
        if not row or row[1] != currency:
            raise ValueError("No matching offer in this currency")
        offer, _, price, paid_once, credit = row
        state = "paid" if credit == price else "review" if paid_once else "open"
        return dict(offer=offer, price=price, credit=credit, remaining=price-credit, state=state)

    def amount_due(self, customer, product, currency, monthly=None):
        if monthly is not None:
            _positive(monthly)
        record = self.status(customer, product, currency)
        remaining = record["remaining"] if record["state"] == "open" else 0
        return remaining if monthly is None else min(remaining, monthly)

    def settle(self, customer, product, currency, *, payment_id, amount):
        _positive(amount)
        if not payment_id:
            raise ValueError("Payment ID required")
        with self._write():
            record = self.status(customer, product, currency)
            key = record["offer"]
            old = self.db.execute("SELECT offer,amount FROM payments WHERE id=?", (payment_id,)).fetchone()
            if old is not None:
                if tuple(old) != (key, amount):
                    raise ValueError("Conflicting payment ID")
                return
            if record["state"] != "open" or amount > record["remaining"]:
                raise ValueError("Payment requires reconciliation against the offer")
            self.db.execute("INSERT INTO payments VALUES(?,?,?)", (payment_id, key, amount))
            if amount == record["remaining"]:
                self.db.execute("UPDATE offers SET paid_once=1 WHERE id=?", (key,))

    def refund(self, customer, product, currency, *, refund_id, payment_id, amount):
        _positive(amount)
        if not refund_id:
            raise ValueError("Refund ID required")
        with self._write():
            key = self.status(customer, product, currency)["offer"]
            original = self.db.execute("SELECT amount FROM payments WHERE offer=? AND id=?",
                                       (key, payment_id)).fetchone()
            if not original:
                raise ValueError("Original payment required")
            old = self.db.execute("SELECT payment,amount FROM refunds WHERE id=?", (refund_id,)).fetchone()
            if old is not None:
                if tuple(old) != (payment_id, amount):
                    raise ValueError("Conflicting refund ID")
                return
            taken = self.db.execute("SELECT COALESCE(SUM(amount),0) FROM refunds WHERE payment=?",
                                    (payment_id,)).fetchone()[0]
            if amount > original[0] - taken:
                raise ValueError("Refund exceeds settled payment")
            self.db.execute("INSERT INTO refunds VALUES(?,?,?)", (refund_id, payment_id, amount))
