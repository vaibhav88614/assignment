from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentType
from app.models.user import User
from app.models.verification_request import RequestStatus, VerificationRequest
from app.services.storage_service import storage_service


async def upload_document(
    db: AsyncSession,
    request_id: str,
    user: User,
    file: UploadFile,
    document_type: DocumentType,
) -> Document:
    result = await db.execute(
        select(VerificationRequest).where(VerificationRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    # Only owner can upload, and only in DRAFT or INFO_REQUESTED states
    if req.investor_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your request")

    if req.status not in (RequestStatus.DRAFT, RequestStatus.INFO_REQUESTED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only upload documents in DRAFT or INFO_REQUESTED status",
        )

    stored_filename, file_size = await storage_service.save_file(file)

    doc = Document(
        request_id=request_id,
        uploaded_by=user.id,
        document_type=document_type,
        original_filename=file.filename or "unknown",
        stored_filename=stored_filename,
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
    )
    db.add(doc)
    await db.flush()
    return doc


async def list_documents(db: AsyncSession, request_id: str) -> list[Document]:
    result = await db.execute(
        select(Document)
        .where(Document.request_id == request_id)
        .order_by(Document.uploaded_at.desc())
    )
    return list(result.scalars().all())


async def delete_document(db: AsyncSession, document_id: str, user: User) -> None:
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if doc.uploaded_by != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your document")

    # Check request is in editable state
    req_result = await db.execute(
        select(VerificationRequest).where(VerificationRequest.id == doc.request_id)
    )
    req = req_result.scalar_one()
    if req.status not in (RequestStatus.DRAFT, RequestStatus.INFO_REQUESTED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete documents unless request is in DRAFT or INFO_REQUESTED status",
        )

    await storage_service.delete_file(doc.stored_filename)
    await db.delete(doc)
    await db.flush()
