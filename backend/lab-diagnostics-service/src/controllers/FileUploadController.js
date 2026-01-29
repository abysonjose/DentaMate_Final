const FileUploadService = require('../services/FileUploadService');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;

class FileUploadController {
  constructor() {
    this.uploadService = new FileUploadService();
    this.multerUpload = this.uploadService.getMulterConfig();
  }

  /**
   * Upload diagnostic files
   */
  async uploadFiles(req, res) {
    try {
      // Use multer middleware
      this.multerUpload.array('files', 10)(req, res, async (err) => {
        if (err) {
          logger.error('Multer upload error:', err);
          return res.status(400).json({
            success: false,
            message: err.message || 'File upload failed'
          });
        }

        try {
          const files = req.files;
          if (!files || files.length === 0) {
            return res.status(400).json({
              success: false,
              message: 'No files provided'
            });
          }

          const uploadMetadata = {
            orderId: req.body.orderId,
            category: req.body.category || 'IMAGE',
            replaces: req.body.replaces
          };

          // Validate required fields
          if (!uploadMetadata.orderId) {
            return res.status(400).json({
              success: false,
              message: 'Order ID is required'
            });
          }

          const uploads = await this.uploadService.processUpload(
            files,
            uploadMetadata,
            req.user
          );

          res.status(201).json({
            success: true,
            message: 'Files uploaded successfully',
            data: uploads
          });
        } catch (error) {
          logger.error('Error processing upload:', error);
          res.status(500).json({
            success: false,
            message: error.message || 'Failed to process upload'
          });
        }
      });
    } catch (error) {
      logger.error('Error in upload handler:', error);
      res.status(500).json({
        success: false,
        message: 'Upload handler error'
      });
    }
  }

  /**
   * Get file by upload ID
   */
  async getFile(req, res) {
    try {
      const { uploadId } = req.params;
      const { version } = req.query; // thumbnail, web, original

      const upload = await this.uploadService.getFile(uploadId, {
        ...req.user,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      let filePath = upload.filePath;

      // Serve different versions if requested
      if (version && upload.metadata.processedVersions) {
        switch (version) {
          case 'thumbnail':
            filePath = upload.metadata.processedVersions.thumbnail || filePath;
            break;
          case 'web':
            filePath = upload.metadata.processedVersions.web || filePath;
            break;
          default:
            filePath = upload.filePath;
        }
      }

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'File not found on disk'
        });
      }

      // Set appropriate headers
      res.setHeader('Content-Type', upload.fileType);
      res.setHeader('Content-Disposition', `inline; filename="${upload.originalFileName}"`);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('X-Upload-ID', upload.uploadId);

      // Stream the file
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      logger.error('Error serving file:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('Access denied') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to serve file'
      });
    }
  }

  /**
   * Download file
   */
  async downloadFile(req, res) {
    try {
      const { uploadId } = req.params;

      const upload = await this.uploadService.getFile(uploadId, {
        ...req.user,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Log download access
      await upload.logAccess(
        req.user.userId,
        req.user.role,
        'DOWNLOAD',
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      );

      // Check if file exists
      try {
        await fs.access(upload.filePath);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'File not found on disk'
        });
      }

      // Set download headers
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${upload.originalFileName}"`);
      res.setHeader('X-Upload-ID', upload.uploadId);

      // Stream the file
      res.sendFile(path.resolve(upload.filePath));
    } catch (error) {
      logger.error('Error downloading file:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('Access denied') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to download file'
      });
    }
  }

  /**
   * Get files for an order
   */
  async getOrderFiles(req, res) {
    try {
      const { orderId } = req.params;
      const includeDeleted = req.query.includeDeleted === 'true';

      const files = await this.uploadService.getOrderFiles(
        orderId,
        req.user,
        includeDeleted
      );

      res.json({
        success: true,
        message: 'Order files retrieved successfully',
        data: files
      });
    } catch (error) {
      logger.error('Error getting order files:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve order files'
      });
    }
  }

  /**
   * Delete file
   */
  async deleteFile(req, res) {
    try {
      const { uploadId } = req.params;

      const result = await this.uploadService.deleteFile(uploadId, req.user);

      res.json({
        success: true,
        message: 'File deleted successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error deleting file:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('Access denied') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete file'
      });
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(req, res) {
    try {
      const { uploadId } = req.params;

      const upload = await this.uploadService.getFile(uploadId, req.user);

      // Return metadata without file content
      const metadata = {
        uploadId: upload.uploadId,
        orderId: upload.orderId,
        fileName: upload.fileName,
        originalFileName: upload.originalFileName,
        fileType: upload.fileType,
        fileSize: upload.fileSize,
        uploadedBy: upload.uploadedBy,
        uploadedByRole: upload.uploadedByRole,
        category: upload.category,
        version: upload.version,
        isLatestVersion: upload.isLatestVersion,
        metadata: upload.metadata,
        processingStatus: upload.processingStatus,
        aiAnalysisStatus: upload.aiAnalysisStatus,
        createdAt: upload.createdAt,
        updatedAt: upload.updatedAt
      };

      res.json({
        success: true,
        message: 'File metadata retrieved successfully',
        data: metadata
      });
    } catch (error) {
      logger.error('Error getting file metadata:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('Access denied') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve file metadata'
      });
    }
  }

  /**
   * Replace file
   */
  async replaceFile(req, res) {
    try {
      const { uploadId } = req.params;

      // Use multer middleware for single file
      this.multerUpload.single('file')(req, res, async (err) => {
        if (err) {
          logger.error('Multer upload error:', err);
          return res.status(400).json({
            success: false,
            message: err.message || 'File upload failed'
          });
        }

        try {
          const file = req.file;
          if (!file) {
            return res.status(400).json({
              success: false,
              message: 'No replacement file provided'
            });
          }

          // Get original upload to extract metadata
          const originalUpload = await this.uploadService.getFile(uploadId, req.user);

          const uploadMetadata = {
            orderId: originalUpload.orderId,
            category: originalUpload.category,
            replaces: uploadId
          };

          const uploads = await this.uploadService.processUpload(
            [file],
            uploadMetadata,
            req.user
          );

          res.json({
            success: true,
            message: 'File replaced successfully',
            data: uploads[0]
          });
        } catch (error) {
          logger.error('Error replacing file:', error);
          res.status(500).json({
            success: false,
            message: error.message || 'Failed to replace file'
          });
        }
      });
    } catch (error) {
      logger.error('Error in replace file handler:', error);
      res.status(500).json({
        success: false,
        message: 'Replace file handler error'
      });
    }
  }

  /**
   * Get upload statistics
   */
  async getUploadStatistics(req, res) {
    try {
      const dateRange = {
        start: req.query.startDate,
        end: req.query.endDate
      };

      const stats = await this.uploadService.getUploadStatistics(req.user, dateRange);

      res.json({
        success: true,
        message: 'Upload statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      logger.error('Error getting upload statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve upload statistics'
      });
    }
  }

  /**
   * Get file access log
   */
  async getFileAccessLog(req, res) {
    try {
      const { uploadId } = req.params;

      const upload = await this.uploadService.getFile(uploadId, req.user);

      // Only allow access log viewing for admins and file owner
      if (upload.uploadedBy !== req.user.userId && 
          !['BRANCH_ADMIN', 'CENTRAL_ADMIN', 'SAAS_ADMIN'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Cannot view access log'
        });
      }

      res.json({
        success: true,
        message: 'File access log retrieved successfully',
        data: {
          uploadId: upload.uploadId,
          fileName: upload.originalFileName,
          accessLog: upload.accessLog
        }
      });
    } catch (error) {
      logger.error('Error getting file access log:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('Access denied') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve access log'
      });
    }
  }
}

module.exports = FileUploadController;