from fastapi import APIRouter, File, UploadFile, Form, Depends
from app.services.transaction_service import TransactionService
from app.models.transaction import ProcessingResult
from app.repositories import TransactionRepository

router = APIRouter(prefix="/upload", tags=["upload"])

# Dependency to get TransactionService instance
def get_transaction_service() -> TransactionService:
    # For now, we instantiate directly. Later, this will be handled by a dependency injection framework
    # and use the actual LLMParser and DuplicateDetectorService
    transaction_repo = TransactionRepository()
    # These are placeholders; actual implementations will be created later
    llm_parser = type('DummyLLMParser', (object,), {'parse_screenshot': lambda self, *args, **kwargs: []})()
    duplicate_detector = type('DummyDuplicateDetectorService', (object,), {'find_duplicates': lambda self, *args, **kwargs: None})(transaction_repo)
    return TransactionService(transaction_repo, llm_parser, duplicate_detector)

@router.post("/screenshot", response_model=ProcessingResult)
async def upload_screenshot(
    file: UploadFile = File(...),
    source_app: str = Form(...),
    transaction_service: TransactionService = Depends(get_transaction_service)
):
    """
    Upload transaction screenshot for parsing.
    Returns parsed transactions with duplicate flags.
    """
    image_bytes = await file.read()
    result = await transaction_service.process_upload(image_bytes, source_app)
    return result
