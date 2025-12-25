from typing import Generic, TypeVar, List, Optional
import sqlite3
from contextlib import contextmanager
from app.utils.database import get_db_connection

T = TypeVar('T')

class BaseRepository(Generic[T]):
    def __init__(self, table_name: str):
        self.table_name = table_name
    
    @contextmanager
    def get_connection(self):
        # Use the centralized get_db_connection from app.utils.database
        with get_db_connection() as conn:
            yield conn
