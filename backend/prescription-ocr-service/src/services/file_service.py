import os
import aiofiles
import hashlib
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException, status
from src.config.settings import settings
from src.utils.logger import get_logger
from src.utils.exceptions import FileProcessingError

logger = get_logger(__name__)

class FileService:
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        self.max_file_size = settings.MAX_FILE_SIZE
        self.allowed_extensions = [ext.lower() for ext in settings.ALLOWED_EXTENSIONS]
        
        # Create upload directory if it doesn't exist
        os.makedirs(self.upload_dir, exist_ok=True)
    
    async def save_uploaded_file(
        self, 
        file: UploadFile, 
        tenant_id: str, 
        request_id: str
    ) -> Tuple[str, str, int]:
        """Save uploaded file and return file path, hash, and size"""
        try:
            # Validate file
            await self._validate_file(file)
            
            # Generate secure filename
            file_extension = self._get_file_extension(file.filename)
            secure_filename = f"{tenant_id}_{request_id}_{hashlib.md5(file.filename.encode()).hexdigest()[:8]}.{file_extension}"
            
            # Create tenant-specific directory
            tenant_dir = os.path.join(self.upload_dir, tenant_id)
            os.makedirs(tenant_dir, exist_ok=True)
            
            file_path = os.path.join(tenant_dir, secure_filename)
            
            # Save file
            file_size = 0
            file_hash = hashlib.sha256()
            
            async with aiofiles.open(file_path, 'wb') as f:
                while chunk := await file.read(8192):  # Read in 8KB chunks
                    file_size += len(chunk)
                    file_hash.update(chunk)
                    await f.write(chunk)
            
            # Reset file position for potential re-reading
            await file.seek(0)
            
            logger.info(f"File saved: {file_path} ({file_size} bytes)")
            return file_path, file_hash.hexdigest(), file_size
            
        except Exception as e:
            logger.error(f"Failed to save uploaded file: {e}")
            raise FileProcessingError(f"File save failed: {str(e)}")
    
    async def _validate_file(self, file: UploadFile):
        """Validate uploaded file"""
        # Check if file is provided
        if not file or not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        # Check file extension
        file_extension = self._get_file_extension(file.filename)
        if file_extension not in self.allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed. Allowed types: {', '.join(self.allowed_extensions)}"
            )
        
        # Check file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        if file_size > self.max_file_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size: {self.max_file_size / 1024 / 1024:.1f}MB"
            )
        
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty file not allowed"
            )
    
    def _get_file_extension(self, filename: str) -> str:
        """Get file extension from filename"""
        if not filename or '.' not in filename:
            return ""
        return filename.rsplit('.', 1)[1].lower()
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete file from filesystem"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"File deleted: {file_path}")
                return True
            else:
                logger.warning(f"File not found for deletion: {file_path}")
                return False
        except Exception as e:
            logger.error(f"Failed to delete file {file_path}: {e}")
            return False
    
    async def get_file_info(self, file_path: str) -> Optional[dict]:
        """Get file information"""
        try:
            if not os.path.exists(file_path):
                return None
            
            stat = os.stat(file_path)
            return {
                "path": file_path,
                "size": stat.st_size,
                "created": stat.st_ctime,
                "modified": stat.st_mtime,
                "exists": True
            }
        except Exception as e:
            logger.error(f"Failed to get file info for {file_path}: {e}")
            return None
    
    def get_mime_type(self, filename: str) -> str:
        """Get MIME type based on file extension"""
        extension = self._get_file_extension(filename)
        
        mime_types = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'pdf': 'application/pdf',
            'tiff': 'image/tiff',
            'tif': 'image/tiff',
            'bmp': 'image/bmp'
        }
        
        return mime_types.get(extension, 'application/octet-stream')
    
    async def cleanup_old_files(self, days_old: int = 30):
        """Clean up files older than specified days"""
        try:
            import time
            current_time = time.time()
            cutoff_time = current_time - (days_old * 24 * 60 * 60)
            
            deleted_count = 0
            
            for root, dirs, files in os.walk(self.upload_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    try:
                        if os.path.getmtime(file_path) < cutoff_time:
                            os.remove(file_path)
                            deleted_count += 1
                    except Exception as e:
                        logger.error(f"Failed to delete old file {file_path}: {e}")
            
            logger.info(f"Cleaned up {deleted_count} old files")
            return deleted_count
            
        except Exception as e:
            logger.error(f"File cleanup failed: {e}")
            return 0