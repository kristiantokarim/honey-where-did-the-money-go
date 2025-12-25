# Expense Tracker - Technical Design Document

## 1. Executive Summary

A mobile-first web application that allows users to upload transaction history screenshots from multiple e-money and banking apps, parse them using LLM, review/edit the extracted data, and store them locally with duplicate detection.

## 2. System Architecture

### 2.1 Architecture Pattern
**Three-tier architecture** with clear separation of concerns:
- **Presentation Layer**: Mobile-first web UI
- **Business Logic Layer**: Transaction parsing, duplicate detection, validation
- **Data Access Layer**: SQLite database operations

### 2.2 High-Level Component Diagram
```
┌─────────────────────────────────────────────┐
│         Presentation Layer (Frontend)       │
│  - Screenshot Upload UI                     │
│  - Transaction Review/Edit Interface        │
│  - Monthly Summary Dashboard                │
└─────────────────┬───────────────────────────┘
                  │ HTTP/REST API
┌─────────────────▼───────────────────────────┐
│       Business Logic Layer (Backend)        │
│  - Image Processing Service                 │
│  - LLM Parser Service (Gemini)              │
│  - Duplicate Detection Engine               │
│  - Category Management                      │
│  - Validation & Business Rules              │
└─────────────────┬───────────────────────────┘
                  │ SQL
┌─────────────────▼───────────────────────────┐
│      Data Access Layer (Repository)         │
│  - Transaction Repository                   │
│  - Category Repository                      │
│  - Duplicate Detection Repository           │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│            SQLite Database                  │
└─────────────────────────────────────────────┘
```

## 3. Technology Stack

### 3.1 Backend Stack
**Framework**: Python with Flask or FastAPI
- **Rationale**: 
  - Python has excellent LLM integration libraries
  - Flask/FastAPI are lightweight, easy to deploy locally
  - FastAPI provides automatic API documentation
  - Good image processing libraries available

**Core Dependencies**:
```
fastapi==0.109.0
uvicorn==0.27.0
python-multipart==0.0.6  # File upload handling
pillow==10.2.0           # Image processing
pydantic==2.5.0          # Data validation
python-dotenv==1.0.0     # Configuration

# LLM Provider SDKs (install based on choice)
google-generativeai==0.3.2  # For Gemini
anthropic==0.40.0           # For Claude
```

### 3.2 Frontend Stack
**Framework**: React with Vite (or vanilla HTML/JS for simpler approach)
- **Rationale**:
  - Modern, component-based for complex UI interactions
  - Excellent mobile responsiveness
  - Rich ecosystem for form handling
  - Alternative: Vanilla approach with Tailwind CSS for simplicity

**Core Dependencies**:
```
react==18.2.0
react-dom==18.2.0
axios==1.6.5             # API calls
tailwindcss==3.4.0       # Mobile-first styling
date-fns==3.0.0          # Date handling
react-hook-form==7.49.0  # Form management
```

**Alternative (Simpler)**: Plain HTML + Tailwind CSS + Alpine.js/Vanilla JS

### 3.3 LLM Integration
**Primary Provider**: Google Gemini 2.0 Flash
**Secondary Provider**: Claude Sonnet 4 (easily swappable)

**Design Pattern**: Strategy Pattern with Abstract Base Class
- Allows switching providers via configuration without code changes
- Both providers implement the same interface (`BaseLLMParser`)
- Factory function handles instantiation based on environment variable

**Provider Selection Rationale:**
- **Gemini**: 
  - Free tier available (15 RPM)
  - Native JSON mode for structured output
  - Good Indonesian language support
- **Claude**: 
  - Superior reasoning and accuracy
  - Better at handling ambiguous screenshots
  - Paid tier more generous than Gemini

**Switching Providers:**
Simply change the `.env` file:
```bash
LLM_PROVIDER=claude  # Change from 'gemini' to 'claude'
CLAUDE_API_KEY=your_key_here
```

No code changes required!

## 4. Database Design

### 4.1 Schema

```sql
-- Categories table
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT NOT NULL,
    source_app TEXT NOT NULL,  -- e.g., 'Gojek', 'OVO', 'Bank Jago'
    payment_method TEXT,        -- e.g., 'GoPay', 'OVO Cash'
    target_account TEXT,        -- Who/where the payment went to
    category_id INTEGER,
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of_id INTEGER,    -- Reference to original transaction if duplicate
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (duplicate_of_id) REFERENCES transactions(id)
);

-- Create index for duplicate detection
CREATE INDEX idx_duplicate_check ON transactions(date, amount, source_app, description);
CREATE INDEX idx_date_range ON transactions(date);
CREATE INDEX idx_category ON transactions(category_id);

-- Upload history (for tracking processed screenshots)
CREATE TABLE upload_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source_app TEXT NOT NULL,
    screenshot_hash TEXT UNIQUE,  -- SHA256 of image to detect re-uploads
    transactions_extracted INTEGER DEFAULT 0,
    duplicates_detected INTEGER DEFAULT 0
);
```

### 4.2 Default Categories (Configurable)
```sql
INSERT INTO categories (name) VALUES 
    ('Food & Dining'),
    ('Transportation'),
    ('Shopping'),
    ('Bills & Utilities'),
    ('Healthcare'),
    ('Entertainment'),
    ('Transfer'),
    ('Income'),
    ('Other');
```

## 5. Backend Design

### 5.1 Project Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app initialization
│   ├── config.py               # Configuration management
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── transaction.py      # Pydantic models
│   │   └── category.py
│   │
│   ├── repositories/           # Data Access Layer
│   │   ├── __init__.py
│   │   ├── base.py            # Base repository with common operations
│   │   ├── transaction_repository.py
│   │   ├── category_repository.py
│   │   └── upload_history_repository.py
│   │
│   ├── services/               # Business Logic Layer
│   │   ├── __init__.py
│   │   ├── llm/
│   │   │   ├── __init__.py
│   │   │   ├── base_parser.py      # Abstract base class
│   │   │   ├── gemini_parser.py    # Gemini implementation
│   │   │   ├── claude_parser.py    # Claude implementation
│   │   │   └── factory.py          # Parser factory
│   │   ├── image_processor.py
│   │   ├── duplicate_detector.py
│   │   └── transaction_service.py
│   │
│   ├── api/                    # Presentation Layer (API Routes)
│   │   ├── __init__.py
│   │   ├── transactions.py
│   │   ├── categories.py
│   │   ├── upload.py
│   │   └── analytics.py
│   │
│   └── utils/
│       ├── __init__.py
│       ├── database.py         # DB connection management
│       └── validators.py
│
├── tests/
│   ├── test_repositories/
│   ├── test_services/
│   └── test_api/
│
├── requirements.txt
├── .env.example
└── README.md
```

### 5.2 Core Components

#### 5.2.1 Data Access Layer (Repository Pattern)

```python
# repositories/base.py
from typing import Generic, TypeVar, List, Optional
import sqlite3
from contextlib import contextmanager

T = TypeVar('T')

class BaseRepository(Generic[T]):
    def __init__(self, db_path: str, table_name: str):
        self.db_path = db_path
        self.table_name = table_name
    
    @contextmanager
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

# repositories/transaction_repository.py
class TransactionRepository(BaseRepository):
    def create(self, transaction: TransactionCreate) -> int:
        """Insert new transaction and return ID"""
        pass
    
    def find_potential_duplicates(
        self, 
        date: date, 
        amount: Decimal, 
        source_app: str,
        description: str,
        threshold: float = 0.85
    ) -> List[Transaction]:
        """Find similar transactions using fuzzy matching"""
        pass
    
    def get_by_date_range(
        self, 
        start_date: date, 
        end_date: date
    ) -> List[Transaction]:
        """Retrieve transactions within date range"""
        pass
    
    def get_monthly_summary(
        self, 
        year: int, 
        month: int
    ) -> Dict[str, Decimal]:
        """Aggregate expenses by category for a month"""
        pass
```

#### 5.2.2 Business Logic Layer

```python
# services/llm_parser.py (Abstract Base)
from abc import ABC, abstractmethod
from typing import List
from app.models.transaction import ParsedTransaction

class BaseLLMParser(ABC):
    """Abstract base class for LLM providers"""
    
    @abstractmethod
    async def parse_screenshot(
        self, 
        image_bytes: bytes, 
        source_app: str
    ) -> List[ParsedTransaction]:
        """Parse transaction screenshot and return structured data"""
        pass
    
    def _build_prompt(self, source_app: str) -> str:
        """Build app-specific parsing prompt (shared across providers)"""
        return f"""
        Parse this {source_app} transaction history screenshot.
        Extract ALL transactions visible and return JSON array:
        [{{
            "date": "YYYY-MM-DD",
            "amount": decimal number (positive for expenses, negative for income),
            "description": "transaction description",
            "target_account": "recipient/merchant name",
            "payment_method": "payment method used"
        }}]
        
        Rules:
        - Extract date in ISO format
        - Amount should be numeric only, no currency symbols
        - Be precise with transaction descriptions
        - If target account is unclear, use the merchant/service name
        - Return ONLY valid JSON, no additional text
        """

# services/gemini_parser.py
import google.generativeai as genai
import json

class GeminiParser(BaseLLMParser):
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            'gemini-2.0-flash-exp',
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.1
            }
        )
    
    async def parse_screenshot(
        self, 
        image_bytes: bytes, 
        source_app: str
    ) -> List[ParsedTransaction]:
        prompt = self._build_prompt(source_app)
        
        # Prepare image data
        import base64
        image_data = base64.b64encode(image_bytes).decode('utf-8')
        
        response = await self.model.generate_content_async([
            prompt,
            {"mime_type": "image/jpeg", "data": image_data}
        ])
        
        # Parse JSON response
        transactions_data = json.loads(response.text)
        return [ParsedTransaction(**t) for t in transactions_data]

# services/claude_parser.py
import anthropic
import base64
import json

class ClaudeParser(BaseLLMParser):
    def __init__(self, api_key: str):
        self.client = anthropic.Anthropic(api_key=api_key)
    
    async def parse_screenshot(
        self, 
        image_bytes: bytes, 
        source_app: str
    ) -> List[ParsedTransaction]:
        prompt = self._build_prompt(source_app)
        
        # Encode image
        image_data = base64.b64encode(image_bytes).decode('utf-8')
        
        message = await self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_data
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }]
        )
        
        # Extract JSON from response (Claude may wrap in markdown)
        response_text = message.content[0].text
        json_str = response_text.strip()
        if json_str.startswith("```json"):
            json_str = json_str[7:]
        if json_str.startswith("```"):
            json_str = json_str[3:]
        if json_str.endswith("```"):
            json_str = json_str[:-3]
        
        transactions_data = json.loads(json_str.strip())
        return [ParsedTransaction(**t) for t in transactions_data]

# Factory pattern for parser selection
def create_llm_parser(provider: str, api_key: str) -> BaseLLMParser:
    """Factory function to create appropriate LLM parser"""
    parsers = {
        "gemini": GeminiParser,
        "claude": ClaudeParser
    }
    
    if provider not in parsers:
        raise ValueError(f"Unsupported LLM provider: {provider}")
    
    return parsers[provider](api_key)

# services/duplicate_detector.py
class DuplicateDetectorService:
    def __init__(self, repository: TransactionRepository):
        self.repository = repository
    
    def find_duplicates(
        self, 
        candidate: ParsedTransaction
    ) -> Optional[Transaction]:
        """
        Check if transaction already exists in database.
        Uses fuzzy matching on description.
        """
        potential_duplicates = self.repository.find_potential_duplicates(
            date=candidate.date,
            amount=candidate.amount,
            source_app=candidate.source_app,
            description=candidate.description
        )
        
        if not potential_duplicates:
            return None
        
        # Use Levenshtein distance for description similarity
        best_match = self._find_best_match(candidate, potential_duplicates)
        return best_match if best_match.similarity > 0.85 else None

# services/transaction_service.py
class TransactionService:
    """Orchestrates business logic across repositories and services"""
    
    def __init__(
        self,
        transaction_repo: TransactionRepository,
        llm_parser: BaseLLMParser,  # Using base class, not concrete implementation
        duplicate_detector: DuplicateDetectorService
    ):
        self.transaction_repo = transaction_repo
        self.llm_parser = llm_parser
        self.duplicate_detector = duplicate_detector
    
    async def process_upload(
        self, 
        image: bytes, 
        source_app: str
    ) -> ProcessingResult:
        """
        Main business logic flow:
        1. Parse screenshot with LLM
        2. Check for duplicates
        3. Return for user review
        """
        parsed = await self.llm_parser.parse_screenshot(image, source_app)
        
        results = []
        for transaction in parsed:
            duplicate = self.duplicate_detector.find_duplicates(transaction)
            results.append({
                "transaction": transaction,
                "is_duplicate": duplicate is not None,
                "duplicate_of": duplicate.id if duplicate else None
            })
        
        return ProcessingResult(transactions=results)
```

#### 5.2.3 Presentation Layer (API Routes)

```python
# api/upload.py
from fastapi import APIRouter, File, UploadFile, Form
from app.services.transaction_service import TransactionService

router = APIRouter(prefix="/api/upload", tags=["upload"])

@router.post("/screenshot")
async def upload_screenshot(
    file: UploadFile = File(...),
    source_app: str = Form(...)
):
    """
    Upload transaction screenshot for parsing.
    Returns parsed transactions with duplicate flags.
    """
    image_bytes = await file.read()
    result = await transaction_service.process_upload(image_bytes, source_app)
    return result

# api/transactions.py
router = APIRouter(prefix="/api/transactions", tags=["transactions"])

@router.post("/batch")
async def save_transactions(transactions: List[TransactionCreate]):
    """Save reviewed transactions in batch"""
    pass

@router.put("/{transaction_id}")
async def update_transaction(transaction_id: int, data: TransactionUpdate):
    """Update individual transaction"""
    pass

@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: int):
    """Delete transaction (for confirmed duplicates)"""
    pass

@router.get("/monthly-summary")
async def get_monthly_summary(year: int, month: int):
    """Get expense breakdown by category for a month"""
    pass
```

## 6. Frontend Design

### 6.1 Project Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── UploadScreen.jsx
│   │   ├── ReviewScreen.jsx
│   │   ├── TransactionCard.jsx
│   │   ├── MonthlyDashboard.jsx
│   │   └── CategorySelector.jsx
│   │
│   ├── services/
│   │   └── api.js              # Axios API client
│   │
│   ├── utils/
│   │   └── formatters.js       # Date, currency formatting
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── public/
├── package.json
└── vite.config.js
```

### 6.2 Key Screens

#### Screen 1: Upload
- File input for screenshot upload
- Dropdown to select source app (Gojek, OVO, etc.)
- Upload button
- Loading indicator during processing

#### Screen 2: Review & Edit
- List of parsed transactions (cards)
- Each card shows: date, amount, description, source, target, category
- Inline editing for all fields
- Duplicate flag (highlighted in red/orange)
- Actions: Remove, Keep as duplicate
- Batch save button

#### Screen 3: Monthly Dashboard
- Month selector
- Category breakdown (pie chart or list)
- Total expenses
- Transaction list for the month

### 6.3 Mobile-First Considerations
- Bottom navigation bar
- Touch-friendly buttons (min 44px)
- Swipe gestures for card actions
- Progressive Web App (PWA) for offline capability

## 7. LLM Integration Strategy

### 7.1 Architecture Overview

The LLM integration uses the **Strategy Pattern** to allow easy provider switching:

```
┌─────────────────────────────────────┐
│    TransactionService               │
│                                     │
│    depends on: BaseLLMParser       │ ← Interface (abstract)
└──────────────┬──────────────────────┘
               │
               │ Dependency Injection
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌──────▼──────┐
│ GeminiParser│  │ClaudeParser │
│             │  │             │
│implements   │  │implements   │
│BaseLLMParser│  │BaseLLMParser│
└─────────────┘  └─────────────┘
```

**Key Benefits:**
- Switch providers with environment variable only
- Add new providers (OpenAI GPT-4V, etc.) without changing business logic
- Easy A/B testing between providers
- Provider-specific optimizations isolated in implementation classes

### 7.2 Prompt Engineering

**Base System Prompt (Shared across providers):**
```
You are a transaction parser that extracts financial transaction data from 
Indonesian e-money and banking app screenshots. Always return valid JSON array.
Be precise with amounts and dates. Handle Indonesian language transaction 
descriptions accurately.
```

**App-Specific Context:**
- **Gojek**: Look for GoFood, GoRide, GoPay transactions
- **OVO**: OVO Cash, OVO Points distinctions
- **Bank Apps**: Transfer vs debit card vs virtual account patterns

### 7.3 Structured Output

**Gemini Implementation:**
```python
generation_config = {
    "response_mime_type": "application/json",
    "temperature": 0.1  # Lower temperature for consistent parsing
}
```

**Claude Implementation:**
```python
# Claude doesn't have native JSON mode, so we:
# 1. Explicitly request JSON-only in prompt
# 2. Strip markdown code fences from response
# 3. Parse the cleaned JSON
```

### 7.4 Error Handling
- Retry logic for API failures (max 3 retries with exponential backoff)
- Fallback: Manual entry mode if parsing fails
- Validation: Ensure all required fields are present post-parsing

## 8. Duplicate Detection Algorithm

### 8.1 Multi-Factor Matching
```python
def calculate_duplicate_score(t1: Transaction, t2: Transaction) -> float:
    """
    Returns similarity score 0.0 to 1.0
    """
    weights = {
        'date_match': 0.3,
        'amount_match': 0.4,
        'description_similarity': 0.2,
        'source_app_match': 0.1
    }
    
    score = 0.0
    
    # Date match (within 1 day tolerance)
    if abs((t1.date - t2.date).days) <= 1:
        score += weights['date_match']
    
    # Amount match (exact)
    if t1.amount == t2.amount:
        score += weights['amount_match']
    
    # Description similarity (Levenshtein)
    desc_similarity = levenshtein_ratio(t1.description, t2.description)
    score += weights['description_similarity'] * desc_similarity
    
    # Source app match
    if t1.source_app == t2.source_app:
        score += weights['source_app_match']
    
    return score
```

### 8.2 Duplicate Handling Rules
- Score >= 0.85: Flag as duplicate, show to user for confirmation
- Score 0.70-0.84: Show as "possible duplicate" (yellow warning)
- Score < 0.70: Treat as unique transaction

## 9. API Design

### 9.1 REST Endpoints

```
POST   /api/upload/screenshot
       Body: multipart/form-data (file, source_app)
       Response: { transactions: [...], duplicates_detected: N }

POST   /api/transactions/batch
       Body: [{ date, amount, description, ... }]
       Response: { created: N, failed: N }

GET    /api/transactions?start_date=...&end_date=...
       Response: [{ id, date, amount, ... }]

PUT    /api/transactions/{id}
       Body: { field: value }
       Response: { success: true }

DELETE /api/transactions/{id}
       Response: { success: true }

GET    /api/categories
       Response: [{ id, name }]

POST   /api/categories
       Body: { name: "New Category" }
       Response: { id, name }

GET    /api/analytics/monthly?year=2025&month=1
       Response: {
           total: 5000000,
           by_category: { "Food": 2000000, ... },
           transaction_count: 45
       }
```

## 10. Deployment

### 10.1 Local Deployment (Recommended for MVP)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev  # Development mode
npm run build && npm run preview  # Production mode
```

**Access**: `http://localhost:5173` (frontend) → `http://localhost:8000` (backend)

### 10.2 Docker Deployment (Optional)
```dockerfile
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend/data:/app/data
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
  
  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
```

### 10.3 Free Cloud Deployment (If needed)
- **Backend**: Render.com (Free tier, 750 hours/month)
- **Frontend**: Vercel or Netlify (Free tier)
- **Database**: SQLite file in persistent volume

## 11. Configuration Management

### 11.1 Environment Variables
```bash
# .env
# LLM Provider Configuration
LLM_PROVIDER=gemini  # Options: gemini, claude
GEMINI_API_KEY=your_gemini_key_here
CLAUDE_API_KEY=your_claude_key_here

# Application Settings
DATABASE_PATH=./data/transactions.db
UPLOAD_DIR=./data/uploads
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173

# Optional: Rate limiting
MAX_UPLOADS_PER_MINUTE=10
```

### 11.2 Application Initialization (config.py)
```python
# app/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    llm_provider: str = "gemini"
    gemini_api_key: str = ""
    claude_api_key: str = ""
    database_path: str = "./backend/data/transactions.db"
    upload_dir: str = "./backend/data/uploads"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173"
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

# app/main.py
from fastapi import FastAPI
from app.config import get_settings
from app.services.llm.factory import create_llm_parser

settings = get_settings()

# Initialize LLM parser based on configuration
llm_parser = create_llm_parser(
    provider=settings.llm_provider,
    api_key=settings.gemini_api_key if settings.llm_provider == "gemini" 
            else settings.claude_api_key
)
```

### 11.3 Category Configuration
```json
// config/categories.json
{
  "categories": [
    { "name": "Food & Dining", "keywords": ["food", "restaurant", "cafe"] },
    { "name": "Transportation", "keywords": ["goride", "grab", "fuel"] },
    ...
  ]
}
```

## 12. Testing Strategy

### 12.1 Unit Tests
- Repository layer: Database operations
- Service layer: Business logic (duplicate detection, parsing logic)
- Utilities: Validators, formatters

### 12.2 Integration Tests
- API endpoints: Request/response contracts
- LLM parsing: Test with sample screenshots (mocked responses)

### 12.3 Manual Testing Checklist
- [ ] Upload screenshot from each supported app
- [ ] Verify duplicate detection with re-uploaded screenshot
- [ ] Edit transaction fields and save
- [ ] Delete duplicate transactions
- [ ] View monthly summary with accurate totals
- [ ] Test on mobile device (responsive design)

## 13. Development Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Setup project structure (backend + frontend)
- [ ] Implement database schema and repositories
- [ ] Basic API endpoints (CRUD transactions)
- [ ] Simple upload UI

### Phase 2: LLM Integration (Week 2)
- [ ] Integrate Gemini API
- [ ] Implement parsing service
- [ ] Test with screenshots from each app
- [ ] Refine prompts for accuracy

### Phase 3: Duplicate Detection (Week 3)
- [ ] Implement duplicate detection algorithm
- [ ] Add review/edit interface
- [ ] Batch save functionality

### Phase 4: Analytics & Polish (Week 4)
- [ ] Monthly dashboard
- [ ] Category management UI
- [ ] Mobile optimization
- [ ] Error handling & validation

## 14. Future Enhancements (Post-MVP)
- Export to Google Sheets integration
- OCR fallback for non-LLM parsing
- Multi-user support with authentication
- Automatic categorization using ML
- Budget tracking and alerts
- Receipt image attachment to transactions
- Support for more banking apps

## 15. Security Considerations
- **API Key Storage**: Use environment variables, never commit to git
- **Input Validation**: Sanitize all user inputs (SQL injection prevention)
- **File Upload**: Validate file types (only images), size limits (max 10MB)
- **Rate Limiting**: Implement on upload endpoint (max 10 uploads/minute)
- **CORS**: Configure allowed origins properly

## 16. Performance Considerations
- **LLM Caching**: Cache parsed results by screenshot hash
- **Database Indexing**: Proper indexes on date, amount, source_app
- **Image Optimization**: Resize/compress uploaded images before LLM processing
- **Lazy Loading**: Paginate transaction lists on frontend

## 17. Error Handling Strategy

### Backend
```python
class AppException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code

@app.exception_handler(AppException)
async def app_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message}
    )
```

### Frontend
- Display user-friendly error messages
- Retry mechanism for failed uploads
- Offline indicator with queue for pending uploads (PWA)

## 18. Monitoring & Logging
- Log all LLM API calls (token usage, latency)
- Log duplicate detection decisions
- Track upload success/failure rates
- Database query performance logging

---

## Summary

This design provides a solid foundation for building your expense tracking solution with:
- **Clean architecture** with separated concerns
- **Scalable structure** that can grow with requirements
- **Best practices** for data persistence, API design, and error handling
- **Mobile-first approach** optimized for phone usage
- **Practical tech stack** that's easy to deploy locally or on free cloud tiers

The MVP focuses on core functionality while keeping the door open for future enhancements like Google Sheets integration or multi-user support.
