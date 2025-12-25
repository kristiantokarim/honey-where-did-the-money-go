import sqlite3
from contextlib import contextmanager
import os

DATABASE_PATH = os.getenv("DATABASE_PATH", "./backend/data/transactions.db")

def init_db():
    """Initializes the database schema and inserts default categories."""
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    with sqlite3.connect(DATABASE_PATH) as conn:
        cursor = conn.cursor()

        # Categories table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Transactions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                description TEXT NOT NULL,
                source_app TEXT NOT NULL,
                payment_method TEXT,
                target_account TEXT,
                category_id INTEGER,
                is_duplicate BOOLEAN DEFAULT FALSE,
                duplicate_of_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (category_id) REFERENCES categories(id),
                FOREIGN KEY (duplicate_of_id) REFERENCES transactions(id)
            );
        """)

        # Upload history table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS upload_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                source_app TEXT NOT NULL,
                screenshot_hash TEXT UNIQUE,
                transactions_extracted INTEGER DEFAULT 0,
                duplicates_detected INTEGER DEFAULT 0
            );
        """)

        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_duplicate_check ON transactions(date, amount, source_app, description);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_date_range ON transactions(date);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_category ON transactions(category_id);")

        # Insert default categories if they don't exist
        default_categories = [
            ('Food & Dining'), ('Transportation'), ('Shopping'),
            ('Bills & Utilities'), ('Healthcare'), ('Entertainment'),
            ('Transfer'), ('Income'), ('Other')
        ]
        for category in default_categories:
            try:
                cursor.execute("INSERT INTO categories (name) VALUES (?)", (category,))
            except sqlite3.IntegrityError:
                # Category already exists, skip
                pass
        
        conn.commit()

@contextmanager
def get_db_connection():
    """Provides a context-managed database connection."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row # This allows accessing columns by name
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print(f"Initializing database at {DATABASE_PATH}...")
    init_db()
    print("Database initialized successfully.")
    # Example usage:
    # with get_db_connection() as conn:
    #     cursor = conn.cursor()
    #     cursor.execute("SELECT name FROM categories")
    #     print("Categories:", cursor.fetchall())
