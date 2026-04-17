"""
Storage service — re-exports from cloud_storage_service for backward compatibility.
Uses Cloudinary when CLOUDINARY_URL is set, local filesystem otherwise.
"""

from app.services.cloud_storage_service import StorageService, storage_service

__all__ = ["StorageService", "storage_service"]
