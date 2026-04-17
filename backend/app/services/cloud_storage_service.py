"""
Cloudinary-backed storage service for production deployments.
Falls back to local filesystem when CLOUDINARY_URL is not configured.
"""

import io
import logging
import os
import uuid

import aiofiles
from fastapi import HTTPException, UploadFile, status

from app.config import settings

logger = logging.getLogger("aiv.storage")

_cloudinary_configured = False

if settings.CLOUDINARY_URL:
    try:
        import cloudinary
        import cloudinary.uploader
        import cloudinary.api

        cloudinary.config(cloudinary_url=settings.CLOUDINARY_URL)
        _cloudinary_configured = True
        logger.info("Cloudinary storage configured")
    except ImportError:
        logger.warning("cloudinary package not installed; falling back to local storage")
else:
    logger.info("CLOUDINARY_URL not set; using local file storage")


class StorageService:
    """Unified storage: uses Cloudinary when configured, local disk otherwise."""

    def __init__(self, upload_dir: str | None = None):
        self.upload_dir = upload_dir or settings.UPLOAD_DIR
        os.makedirs(self.upload_dir, exist_ok=True)

    @property
    def is_cloud(self) -> bool:
        return _cloudinary_configured

    async def save_file(self, file: UploadFile) -> tuple[str, int]:
        """Save an uploaded file. Returns (stored_filename_or_public_id, file_size)."""
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
        unique_name = f"{uuid.uuid4().hex}{ext}"

        if self.is_cloud:
            return await self._save_cloudinary(content, unique_name, file.content_type or ""), file_size
        else:
            return await self._save_local(content, unique_name), file_size

    async def _save_cloudinary(self, content: bytes, filename: str, content_type: str) -> str:
        """Upload to Cloudinary. Returns the public_id."""
        import cloudinary.uploader

        resource_type = "raw" if "pdf" in content_type else "image"
        public_id = f"aiv_docs/{filename}"

        result = cloudinary.uploader.upload(
            io.BytesIO(content),
            public_id=public_id,
            resource_type=resource_type,
            folder="aiv_docs",
            overwrite=True,
        )
        # Store the full public_id so we can retrieve/delete later
        return f"cloud:{result['public_id']}:{result['resource_type']}"

    async def _save_local(self, content: bytes, filename: str) -> str:
        """Save to local filesystem. Returns the filename."""
        file_path = os.path.join(self.upload_dir, filename)
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)
        return filename

    def get_file_path(self, stored_filename: str) -> str:
        """Get a local file path for download. Only works for local storage."""
        if stored_filename.startswith("cloud:"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Use get_download_url() for cloud-stored files",
            )
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

    def get_download_url(self, stored_filename: str) -> str | None:
        """Get a Cloudinary download URL, or None for local files."""
        if not stored_filename.startswith("cloud:"):
            return None
        parts = stored_filename.split(":", 2)
        if len(parts) != 3:
            return None
        _, public_id, resource_type = parts
        import cloudinary.utils
        url, _ = cloudinary.utils.cloudinary_url(
            public_id,
            resource_type=resource_type,
            flags="attachment",
        )
        return url

    async def delete_file(self, stored_filename: str) -> None:
        if stored_filename.startswith("cloud:"):
            await self._delete_cloudinary(stored_filename)
        else:
            await self._delete_local(stored_filename)

    async def _delete_cloudinary(self, stored_filename: str) -> None:
        parts = stored_filename.split(":", 2)
        if len(parts) != 3:
            return
        _, public_id, resource_type = parts
        try:
            import cloudinary.uploader
            cloudinary.uploader.destroy(public_id, resource_type=resource_type)
        except Exception as e:
            logger.warning("Failed to delete Cloudinary file %s: %s", public_id, e)

    async def _delete_local(self, stored_filename: str) -> None:
        path = os.path.join(self.upload_dir, stored_filename)
        real_path = os.path.realpath(path)
        real_upload = os.path.realpath(self.upload_dir)
        if real_path.startswith(real_upload) and os.path.isfile(real_path):
            os.remove(real_path)

    async def save_letter(self, content: str | bytes, filename: str, is_pdf: bool = True) -> str:
        """Save a generated letter (PDF or HTML). Returns stored path or cloud ID."""
        letters_dir = os.path.join(self.upload_dir, "letters")
        os.makedirs(letters_dir, exist_ok=True)

        if self.is_cloud:
            import cloudinary.uploader
            data = content if isinstance(content, bytes) else content.encode("utf-8")
            resource_type = "raw"
            public_id = f"aiv_letters/{filename}"
            result = cloudinary.uploader.upload(
                io.BytesIO(data),
                public_id=public_id,
                resource_type=resource_type,
                folder="aiv_letters",
                overwrite=True,
            )
            return f"cloud:{result['public_id']}:{result['resource_type']}"
        else:
            path = os.path.join(letters_dir, filename)
            if isinstance(content, bytes):
                async with aiofiles.open(path, "wb") as f:
                    await f.write(content)
            else:
                async with aiofiles.open(path, "w", encoding="utf-8") as f:
                    await f.write(content)
            return path


storage_service = StorageService()
