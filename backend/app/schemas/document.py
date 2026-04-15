from datetime import datetime

from pydantic import BaseModel

from app.models.document import DocumentType


class DocumentUploadResponse(BaseModel):
    id: str
    request_id: str
    document_type: DocumentType
    original_filename: str
    file_size: int
    mime_type: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    items: list[DocumentUploadResponse]
