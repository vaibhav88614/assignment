from fastapi import APIRouter, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.document import DocumentType
from app.models.user import User, UserRole
from app.schemas.document import DocumentListResponse, DocumentUploadResponse
from app.services.document_service import delete_document, list_documents, upload_document
from app.services.storage_service import storage_service

router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.post("/{request_id}", response_model=DocumentUploadResponse, status_code=201)
async def upload_doc(
    request_id: str,
    file: UploadFile = File(...),
    document_type: DocumentType = Form(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await upload_document(db, request_id, current_user, file, document_type)
    return doc


@router.get("/{request_id}", response_model=DocumentListResponse)
async def list_docs(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    docs = await list_documents(db, request_id)
    return DocumentListResponse(items=docs)


@router.get("/download/{document_id}")
async def download_doc(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.document import Document
    from app.models.verification_request import VerificationRequest
    from fastapi import HTTPException, status

    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Check access: owner, assigned reviewer, or admin
    req_result = await db.execute(
        select(VerificationRequest).where(VerificationRequest.id == doc.request_id)
    )
    req = req_result.scalar_one()

    if current_user.role == UserRole.INVESTOR and req.investor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if current_user.role == UserRole.REVIEWER and req.assigned_reviewer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    file_path = storage_service.get_file_path(doc.stored_filename)
    return FileResponse(
        path=file_path,
        filename=doc.original_filename,
        media_type=doc.mime_type,
    )


@router.delete("/{document_id}", status_code=204)
async def delete_doc(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await delete_document(db, document_id, current_user)
