from typing import Optional
from app.repositories.base import BaseRepository
import sqlite3
from datetime import datetime

class UploadHistoryRepository(BaseRepository):
    def __init__(self):
        super().__init__("upload_history")

    def create(self, source_app: str, screenshot_hash: str, transactions_extracted: int = 0, duplicates_detected: int = 0) -> int:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO upload_history (upload_timestamp, source_app, screenshot_hash, transactions_extracted, duplicates_detected)
                VALUES (?, ?, ?, ?, ?)
                """,
                (datetime.now().isoformat(), source_app, screenshot_hash, transactions_extracted, duplicates_detected)
            )
            return cursor.lastrowid

    def get_by_hash(self, screenshot_hash: str) -> Optional[sqlite3.Row]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM upload_history WHERE screenshot_hash = ?", (screenshot_hash,))
            return cursor.fetchone()

    def update_counts(self, history_id: int, transactions_extracted: int, duplicates_detected: int) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE upload_history
                SET transactions_extracted = ?, duplicates_detected = ?
                WHERE id = ?
                """,
                (transactions_extracted, duplicates_detected, history_id)
            )
            return cursor.rowcount > 0
