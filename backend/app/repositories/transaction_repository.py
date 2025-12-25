from typing import List, Optional, Dict
from datetime import date
from decimal import Decimal
import sqlite3

from app.repositories.base import BaseRepository
from app.models.transaction import Transaction, TransactionCreate, TransactionUpdate
# Assuming ParsedTransaction has date, amount, description, source_app
# from app.models.transaction import ParsedTransaction

class TransactionRepository(BaseRepository[Transaction]):
    def __init__(self):
        super().__init__("transactions")

    def create(self, transaction: TransactionCreate) -> int:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO transactions (
                    date, amount, description, source_app, payment_method,
                    target_account, category_id, is_duplicate, duplicate_of_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    transaction.date.isoformat(),
                    str(transaction.amount), # Store Decimal as string
                    transaction.description,
                    transaction.source_app,
                    transaction.payment_method,
                    transaction.target_account,
                    transaction.category_id,
                    transaction.is_duplicate,
                    transaction.duplicate_of_id
                )
            )
            return cursor.lastrowid

    def get_by_id(self, transaction_id: int) -> Optional[Transaction]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM transactions WHERE id = ?", (transaction_id,))
            row = cursor.fetchone()
            if row:
                # Convert date string back to date object and Decimal string to Decimal
                data = dict(row)
                data['date'] = date.fromisoformat(data['date'])
                data['amount'] = Decimal(data['amount'])
                data['is_duplicate'] = bool(data['is_duplicate']) # SQLite stores booleans as 0 or 1
                return Transaction(**data)
            return None

    def get_by_date_range(
        self,
        start_date: date,
        end_date: date
    ) -> List[Transaction]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM transactions WHERE date BETWEEN ? AND ? ORDER BY date DESC",
                (start_date.isoformat(), end_date.isoformat())
            )
            transactions = []
            for row in cursor.fetchall():
                data = dict(row)
                data['date'] = date.fromisoformat(data['date'])
                data['amount'] = Decimal(data['amount'])
                data['is_duplicate'] = bool(data['is_duplicate'])
                transactions.append(Transaction(**data))
            return transactions

    def update(self, transaction_id: int, transaction: TransactionUpdate) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            updates = []
            params = []
            if transaction.date is not None:
                updates.append("date = ?")
                params.append(transaction.date.isoformat())
            if transaction.amount is not None:
                updates.append("amount = ?")
                params.append(str(transaction.amount))
            if transaction.description is not None:
                updates.append("description = ?")
                params.append(transaction.description)
            if transaction.source_app is not None:
                updates.append("source_app = ?")
                params.append(transaction.source_app)
            if transaction.payment_method is not None:
                updates.append("payment_method = ?")
                params.append(transaction.payment_method)
            if transaction.target_account is not None:
                updates.append("target_account = ?")
                params.append(transaction.target_account)
            if transaction.category_id is not None:
                updates.append("category_id = ?")
                params.append(transaction.category_id)
            if transaction.is_duplicate is not None:
                updates.append("is_duplicate = ?")
                params.append(transaction.is_duplicate)
            if transaction.duplicate_of_id is not None:
                updates.append("duplicate_of_id = ?")
                params.append(transaction.duplicate_of_id)

            if not updates:
                return False

            params.append(transaction_id)
            cursor.execute(
                f"UPDATE transactions SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                params
            )
            return cursor.rowcount > 0

    def delete(self, transaction_id: int) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM transactions WHERE id = ?", (transaction_id,))
            return cursor.rowcount > 0
            
    def find_potential_duplicates(
        self,
        date: date,
        amount: Decimal,
        source_app: str,
        description: str,
        threshold: float = 0.85 # This threshold will be used in service layer
    ) -> List[Transaction]:
        """
        Find similar transactions based on date, amount, source_app and description.
        For description, this uses a basic LIKE query.
        TODO: Implement Levenshtein distance or other fuzzy matching for description similarity.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Search for transactions within +/- 1 day, similar amount and same source app
            # Using a simplified description match for now
            cursor.execute(
                """
                SELECT * FROM transactions
                WHERE ABS(JULIANDAY(date) - JULIANDAY(?)) <= 1
                AND ABS(amount - ?) < 0.01 -- Allow for minor float discrepancies
                AND source_app = ?
                AND description LIKE ?
                AND is_duplicate = FALSE -- Only consider non-duplicate transactions as originals
                """,
                (date.isoformat(), str(amount), source_app, f'%{description}%')
            )
            
            transactions = []
            for row in cursor.fetchall():
                data = dict(row)
                data['date'] = date.fromisoformat(data['date'])
                data['amount'] = Decimal(data['amount'])
                data['is_duplicate'] = bool(data['is_duplicate'])
                transactions.append(Transaction(**data))
            return transactions
            
    def get_monthly_summary(
        self,
        year: int,
        month: int
    ) -> Dict[str, Decimal]:
        """
        Aggregate expenses by category for a given month and year.
        Returns a dictionary with category names as keys and total amounts as values.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT
                    c.name AS category_name,
                    SUM(t.amount) AS total_amount
                FROM transactions AS t
                LEFT JOIN categories AS c ON t.category_id = c.id
                WHERE STRFTIME('%Y', t.date) = ? AND STRFTIME('%m', t.date) = ?
                AND t.is_duplicate = FALSE
                GROUP BY c.name
                ORDER BY total_amount DESC
                """,
                (str(year), str(month).zfill(2)) # Month needs to be '01', '02', etc.
            )
            
            summary = {}
            for row in cursor.fetchall():
                category_name = row['category_name'] if row['category_name'] else 'Uncategorized'
                summary[category_name] = Decimal(row['total_amount'])
            return summary
