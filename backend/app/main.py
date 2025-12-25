from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import api_router
from app.config import get_settings
from app.utils.database import init_db
import os

settings = get_settings()

app = FastAPI(
    title="Expense Tracker API",
    description="API for tracking expenses by parsing e-money and banking app screenshots.",
    version="0.1.0",
)

# CORS Middleware
# Configure CORS to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.cors_origins.split(',')],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(api_router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    # Ensure upload directory exists
    os.makedirs(settings.upload_dir, exist_ok=True)
    # Initialize the database
    init_db()
    print("Database initialized on startup.")

@app.get("/")
async def root():
    return {"message": "Welcome to Expense Tracker API"}
