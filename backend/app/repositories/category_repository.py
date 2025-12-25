from typing import List, Optional
from app.repositories.base import BaseRepository
from app.models.category import Category, CategoryCreate
import sqlite3

class CategoryRepository(BaseRepository[Category]):
    def __init__(self):
        super().__init__("categories")

    def create(self, category: CategoryCreate) -> int:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO categories (name) VALUES (?)",
                (category.name,)
            )
            return cursor.lastrowid

    def get_by_id(self, category_id: int) -> Optional[Category]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, created_at FROM categories WHERE id = ?", (category_id,))
            row = cursor.fetchone()
            if row:
                return Category(**row)
            return None

    def get_by_name(self, name: str) -> Optional[Category]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, created_at FROM categories WHERE name = ?", (name,))
            row = cursor.fetchone()
            if row:
                return Category(**row)
            return None

    def get_all(self) -> List[Category]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, created_at FROM categories ORDER BY name")
            return [Category(**row) for row in cursor.fetchall()]
    
    def delete(self, category_id: int) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM categories WHERE id = ?", (category_id,))
            return cursor.rowcount > 0
