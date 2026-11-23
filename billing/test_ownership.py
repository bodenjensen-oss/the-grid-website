import sqlite3
import tempfile
import unittest
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from ownership import OwnershipLedger


class OwnershipTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.db = sqlite3.connect(Path(self.folder.name) / "test.sqlite")
        self.addCleanup(self.db.close)
        self.ledger = OwnershipLedger(self.db)
        self.args = ("customer", "grid/v1", "USD")
        self.ledger.open_offer(*self.args, total=10001)

    def test_checkout_from_either_site_uses_the_same_offer(self):
        self.ledger.open_offer(*self.args, total=10001)
        self.ledger.settle(*self.args, payment_id="p1", amount=4000)
        self.assertEqual(self.ledger.amount_due(*self.args, monthly=4000), 4000)
        self.ledger.settle(*self.args, payment_id="p2", amount=4000)
        self.assertEqual(self.ledger.amount_due(*self.args, monthly=4000), 2001)
        self.ledger.settle(*self.args, payment_id="p3", amount=2001)
        self.assertEqual(self.ledger.amount_due(*self.args, monthly=4000), 0)
        self.assertEqual(self.ledger.status(*self.args)["state"], "paid")

    def test_outright_purchase_can_pay_off_remaining_credit(self):
        self.ledger.settle(*self.args, payment_id="monthly", amount=3000)
        self.assertEqual(self.ledger.amount_due(*self.args), 7001)
        self.ledger.settle(*self.args, payment_id="buyout", amount=7001)
        self.assertEqual(self.ledger.amount_due(*self.args), 0)

    def test_retry_is_idempotent_and_conflicting_amount_is_refused(self):
        for _ in range(2):
            self.ledger.settle(*self.args, payment_id="p", amount=4000)
        with self.assertRaises(ValueError):
            self.ledger.settle(*self.args, payment_id="p", amount=4001)
        self.assertEqual(self.ledger.amount_due(*self.args), 6001)

    def test_refunds_before_completion_restore_only_original_credit(self):
        self.ledger.settle(*self.args, payment_id="p", amount=3000)
        for _ in range(2):
            self.ledger.refund(*self.args, refund_id="r", payment_id="p", amount=500)
        with self.assertRaises(ValueError):
            self.ledger.refund(*self.args, refund_id="r2", payment_id="p", amount=2501)
        self.assertEqual(self.ledger.amount_due(*self.args), 7501)

    def test_refunded_completed_offer_waits_for_review(self):
        self.ledger.settle(*self.args, payment_id="buy", amount=10001)
        self.ledger.refund(*self.args, refund_id="r1", payment_id="buy", amount=300)
        self.assertEqual(self.ledger.status(*self.args)["state"], "review")
        self.assertEqual(self.ledger.amount_due(*self.args), 0)

    def test_two_checkouts_settle_the_same_last_balance_once(self):
        from concurrent.futures import ThreadPoolExecutor
        from threading import Barrier

        start = Barrier(2)
        def submit(payment):
            conn = sqlite3.connect(Path(self.folder.name) / "test.sqlite")
            try:
                ledger = OwnershipLedger(conn)
                start.wait(timeout=5)
                try:
                    ledger.settle(*self.args, payment_id=payment, amount=10001)
                except ValueError:
                    return "needs reconciliation"
                return "settled"
            finally:
                conn.close()

        with ThreadPoolExecutor(max_workers=2) as workers:
            outcomes = list(workers.map(submit, ["company", "storefront"]))
        self.assertCountEqual(outcomes, ["settled", "needs reconciliation"])
        self.assertEqual(self.ledger.status(*self.args)["credit"], 10001)

    def test_price_currency_amount_and_payment_ownership(self):
        with self.assertRaises(ValueError):
            self.ledger.open_offer(*self.args, total=9000)
        with self.assertRaises(ValueError):
            self.ledger.open_offer("customer", "grid/v1", "EUR", total=10001)
        for invalid in (0, -1, 1.5, True, 10002):
            with self.assertRaises(ValueError):
                self.ledger.settle(*self.args, payment_id="p", amount=invalid)
        self.ledger.settle(*self.args, payment_id="first", amount=1000)
        self.ledger.open_offer("other", "grid/v1", "USD", total=10001)
        with self.assertRaises(ValueError):
            self.ledger.refund("other", "grid/v1", "USD", refund_id="r", payment_id="first", amount=100)
        self.assertEqual(self.ledger.amount_due(*self.args), 9001)


if __name__ == "__main__":
    unittest.main()
