import os
import uuid

import aiofiles
from fastapi import HTTPException, UploadFile, status

from app.config import settings


class StorageService:
    def __init__(self, upload_dir: str | None = None):
        self.upload_dir = upload_dir or settings.UPLOAD_DIR
        os.makedirs(self.upload_dir, exist_ok=True)

    async def save_file(self, file: UploadFile) -> tuple[str, int]:
        """Save an uploaded file. Returns (stored_filename, file_size)."""
        if file.content_type not in settings.ALLOWED_UPLOAD_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type '{file.content_type}' not allowed. Allowed: {settings.ALLOWED_UPLOAD_TYPES}",
            )

        content = await file.read()
        file_size = len(content)
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

        if file_size > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE_MB}MB",
            )

        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty",
            )

        ext = os.path.splitext(file.filename or "file")[1].lower()
        if ext not in (".pdf", ".jpg", ".jpeg", ".png"):
            ext = ""
        stored_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(self.upload_dir, stored_filename)

        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)

        return stored_filename, file_size

    def get_file_path(self, stored_filename: str) -> str:
        path = os.path.join(self.upload_dir, stored_filename)
        if not os.path.isfile(path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
            )
        # Prevent directory traversal
        real_path = os.path.realpath(path)
        real_upload = os.path.realpath(self.upload_dir)
        if not real_path.startswith(real_upload):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
            )
        return real_path

    async def delete_file(self, stored_filename: str) -> None:
        path = os.path.join(self.upload_dir, stored_filename)
        real_path = os.path.realpath(path)
        real_upload = os.path.realpath(self.upload_dir)
        if real_path.startswith(real_upload) and os.path.isfile(real_path):
            os.remove(real_path)


storage_service = StorageService()
