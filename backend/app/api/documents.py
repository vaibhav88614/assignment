from fastapi import APIRouter, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.document import DocumentType
from app.models.user import User, UserRole
from app.models.verification_request import VerificationRequest
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
    await _check_read_access(db, request_id, current_user)
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

    if not _can_read_request(req, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Cloud-stored files: redirect to Cloudinary URL
    cloud_url = storage_service.get_download_url(doc.stored_filename)
    if cloud_url:
        return RedirectResponse(url=cloud_url)

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


async def _check_read_access(db: AsyncSession, request_id: str, user: User) -> VerificationRequest:
    from sqlalchemy import select
    from fastapi import HTTPException, status

    result = await db.execute(select(VerificationRequest).where(VerificationRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if not _can_read_request(req, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return req


def _can_read_request(req: VerificationRequest, user: User) -> bool:
    if user.role == UserRole.ADMIN:
        return True
    if user.role == UserRole.INVESTOR:
        return req.investor_id == user.id
    if user.role == UserRole.REVIEWER:
        # Assigned reviewer can always access; unassigned reviewers can only
        # browse submitted requests (review queue visibility)
        if req.assigned_reviewer_id == user.id:
            return True
        return req.assigned_reviewer_id is None and req.status.value == "SUBMITTED"
    return False
