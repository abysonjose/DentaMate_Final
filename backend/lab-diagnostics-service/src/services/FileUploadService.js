const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const DiagnosticUpload = require('../models/DiagnosticUpload');
const logger = require('../utils/logger');
const CacheService = require('./CacheService');
const AIIntegrationService = require('./AIIntegrationService');

class FileUploadService {
  constructor() {
    this.cacheService = new CacheService();
    this.aiIntegrationService = new AIIntegrationService();
    this.uploadPath = process.env.UPLOAD_PATH || 'uploads/diagnostics';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024; // 50MB
    this.allowedTypes = (process.env.ALLOWED_FILE_TYPES || '').split(',');
    
    this.initializeUploadDirectory();
  }

  /**
   * Initialize upload directory
   */
  async initializeUploadDirectory() {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
      logger.info('Upload directory initialized', { path: this.uploadPath });
    } catch (error) {
      logger.error('Failed to initialize upload directory:', error);
    }
  }

  /**
   * Configure multer for file uploads
   */
  getMulterConfig() {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const { tenantId, branchId } = req.user;
        const uploadDir = path.join(this.uploadPath, tenantId, branchId);
        
        try {
          await fs.mkdir(uploadDir, { recursive: true });
          cb(null, uploadDir);
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
      }
    });

    const fileFilter = (req, file, cb) => {
      if (this.allowedTypes.length > 0 && !this.allowedTypes.includes(file.mimetype)) {
        return cb(new Error(`File type ${file.mimetype} not allowed`), false);
      }
      cb(null, true);
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: this.maxFileSize,
        files: 10 // Maximum 10 files per upload
      }
    });
  }

  /**
   * Process uploaded files
   */
  async processUpload(files, uploadMetadata, userContext) {
    try {
      const { orderId, category, replaces } = uploadMetadata;
      const { userId, tenantId, branchId, role } = userContext;

      const uploadResults = [];

      for (const file of files) {
        const uploadId = uuidv4();
        const fileUrl = `/api/diagnostics/files/${uploadId}`;
        
        // Calculate checksums
        const fileBuffer = await fs.readFile(file.path);
        const checksums = {
          md5: crypto.createHash('md5').update(fileBuffer).digest('hex'),
          sha256: crypto.createHash('sha256').update(fileBuffer).digest('hex')
        };

        // Process image metadata if it's an image
        let metadata = {};
        if (file.mimetype.startsWith('image/')) {
          metadata = await this.extractImageMetadata(file.path);
        }

        // Create upload record
        const upload = new DiagnosticUpload({
          uploadId,
          orderId,
          tenantId,
          branchId,
          fileName: file.filename,
          originalFileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          filePath: file.path,
          fileUrl,
          uploadedBy: userId,
          uploadedByRole: role,
          category,
          metadata,
          checksums,
          replaces
        });

        await upload.save();

        // If this replaces another file, mark the old one as replaced
        if (replaces) {
          await DiagnosticUpload.findOneAndUpdate(
            { uploadId: replaces },
            { 
              isLatestVersion: false, 
              replacedBy: uploadId 
            }
          );
        }

        // Process image if needed
        if (file.mimetype.startsWith('image/')) {
          await this.processImage(upload);
        }

        // Trigger AI analysis for images
        if (category === 'IMAGE' && file.mimetype.startsWith('image/')) {
          await this.triggerAIAnalysis(upload);
        }

        uploadResults.push(upload);

        logger.info('File uploaded successfully', {
          uploadId,
          orderId,
          fileName: file.originalname,
          fileSize: file.size,
          uploadedBy: userId
        });
      }

      return uploadResults;
    } catch (error) {
      logger.error('Error processing upload:', error);
      throw error;
    }
  }

  /**
   * Extract image metadata
   */
  async extractImageMetadata(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      
      return {
        dimensions: {
          width: metadata.width,
          height: metadata.height
        },
        resolution: {
          x: metadata.density || 72,
          y: metadata.density || 72,
          unit: 'dpi'
        },
        colorSpace: metadata.space,
        compression: metadata.compression,
        format: metadata.format
      };
    } catch (error) {
      logger.warn('Failed to extract image metadata:', error);
      return {};
    }
  }

  /**
   * Process image (resize, optimize)
   */
  async processImage(upload) {
    try {
      const inputPath = upload.filePath;
      const outputDir = path.dirname(inputPath);
      const baseName = path.basename(inputPath, path.extname(inputPath));
      
      // Create thumbnail
      const thumbnailPath = path.join(outputDir, `${baseName}_thumb.jpg`);
      await sharp(inputPath)
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      // Create medium size for web viewing
      const webPath = path.join(outputDir, `${baseName}_web.jpg`);
      await sharp(inputPath)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(webPath);

      // Update upload record with processed versions
      upload.metadata.processedVersions = {
        thumbnail: thumbnailPath,
        web: webPath
      };
      upload.processingStatus = 'COMPLETED';
      
      await upload.save();

      logger.info('Image processed successfully', {
        uploadId: upload.uploadId,
        thumbnailPath,
        webPath
      });
    } catch (error) {
      logger.error('Error processing image:', error);
      upload.processingStatus = 'FAILED';
      await upload.save();
    }
  }

  /**
   * Trigger AI analysis
   */
  async triggerAIAnalysis(upload) {
    try {
      const analysisResult = await this.aiIntegrationService.submitForAnalysis({
        uploadId: upload.uploadId,
        orderId: upload.orderId,
        filePath: upload.filePath,
        fileType: upload.fileType,
        metadata: upload.metadata
      });

      upload.aiAnalysisStatus = 'SENT';
      upload.aiAnalysisId = analysisResult.analysisId;
      await upload.save();

      logger.info('AI analysis triggered', {
        uploadId: upload.uploadId,
        analysisId: analysisResult.analysisId
      });
    } catch (error) {
      logger.error('Failed to trigger AI analysis:', error);
      upload.aiAnalysisStatus = 'FAILED';
      await upload.save();
    }
  }

  /**
   * Get file by upload ID
   */
  async getFile(uploadId, userContext) {
    try {
      const upload = await DiagnosticUpload.findOne({
        uploadId,
        tenantId: userContext.tenantId,
        isActive: true,
        isDeleted: false
      }).populate('order');

      if (!upload) {
        throw new Error('File not found');
      }

      // Validate access
      this.validateFileAccess(upload, userContext);

      // Log access
      await upload.logAccess(
        userContext.userId,
        userContext.role,
        'VIEW',
        {
          ipAddress: userContext.ipAddress,
          userAgent: userContext.userAgent
        }
      );

      return upload;
    } catch (error) {
      logger.error('Error getting file:', error);
      throw error;
    }
  }

  /**
   * Get files for an order
   */
  async getOrderFiles(orderId, userContext, includeDeleted = false) {
    try {
      const uploads = await DiagnosticUpload.findByOrder(orderId, includeDeleted);
      
      // Filter based on user access
      const accessibleUploads = uploads.filter(upload => {
        try {
          this.validateFileAccess(upload, userContext);
          return true;
        } catch {
          return false;
        }
      });

      return accessibleUploads;
    } catch (error) {
      logger.error('Error getting order files:', error);
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(uploadId, userContext) {
    try {
      const upload = await this.getFile(uploadId, userContext);
      
      // Only allow deletion by uploader or admin roles
      if (upload.uploadedBy !== userContext.userId && 
          !['BRANCH_ADMIN', 'CENTRAL_ADMIN', 'SAAS_ADMIN'].includes(userContext.role)) {
        throw new Error('Access denied: Cannot delete this file');
      }

      await upload.softDelete(userContext.userId);

      // Clean up physical files
      await this.cleanupPhysicalFiles(upload);

      logger.info('File deleted', {
        uploadId,
        deletedBy: userContext.userId
      });

      return { success: true };
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Clean up physical files
   */
  async cleanupPhysicalFiles(upload) {
    try {
      // Delete main file
      await fs.unlink(upload.filePath);

      // Delete processed versions if they exist
      if (upload.metadata.processedVersions) {
        const { thumbnail, web } = upload.metadata.processedVersions;
        if (thumbnail) await fs.unlink(thumbnail).catch(() => {});
        if (web) await fs.unlink(web).catch(() => {});
      }

      logger.info('Physical files cleaned up', { uploadId: upload.uploadId });
    } catch (error) {
      logger.warn('Failed to clean up physical files:', error);
    }
  }

  /**
   * Validate file access
   */
  validateFileAccess(upload, userContext) {
    const { role, userId, tenantId, branchId } = userContext;

    // Tenant isolation
    if (upload.tenantId !== tenantId) {
      throw new Error('Access denied: Different tenant');
    }

    // Branch isolation for branch-specific roles
    if (branchId && !['CENTRAL_ADMIN', 'SAAS_ADMIN'].includes(role) && upload.branchId !== branchId) {
      throw new Error('Access denied: Different branch');
    }

    // Role-specific access control
    switch (role) {
      case 'DOCTOR':
        // Doctors can access files for their orders
        if (upload.order && upload.order.doctorId !== userId) {
          throw new Error('Access denied: Not your order');
        }
        break;
      case 'PATIENT':
        // Patients can only access their own files
        if (upload.order && upload.order.patientId !== userId) {
          throw new Error('Access denied: Not your files');
        }
        break;
      case 'LAB_STAFF':
        // Lab staff can access files in their branch
        break;
      case 'NURSE':
      case 'HEAD_NURSE':
      case 'BRANCH_ADMIN':
        // These roles can access files in their branch
        break;
      case 'CENTRAL_ADMIN':
      case 'SAAS_ADMIN':
        // These roles have broader access
        break;
      default:
        throw new Error('Access denied: Invalid role');
    }
  }

  /**
   * Get upload statistics
   */
  async getUploadStatistics(userContext, dateRange = {}) {
    try {
      const { tenantId, branchId, role, userId } = userContext;
      
      let matchQuery = { tenantId, isActive: true, isDeleted: false };
      
      if (branchId && !['CENTRAL_ADMIN', 'SAAS_ADMIN'].includes(role)) {
        matchQuery.branchId = branchId;
      }

      if (role === 'LAB_STAFF') {
        matchQuery.uploadedBy = userId;
      }

      if (dateRange.start || dateRange.end) {
        matchQuery.createdAt = {};
        if (dateRange.start) matchQuery.createdAt.$gte = new Date(dateRange.start);
        if (dateRange.end) matchQuery.createdAt.$lte = new Date(dateRange.end);
      }

      const stats = await DiagnosticUpload.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalUploads: { $sum: 1 },
            totalSize: { $sum: '$fileSize' },
            categoryBreakdown: { $push: '$category' },
            typeBreakdown: { $push: '$fileType' },
            statusBreakdown: { $push: '$processingStatus' },
            aiStatusBreakdown: { $push: '$aiAnalysisStatus' }
          }
        }
      ]);

      return stats[0] || {
        totalUploads: 0,
        totalSize: 0,
        categoryBreakdown: [],
        typeBreakdown: [],
        statusBreakdown: [],
        aiStatusBreakdown: []
      };
    } catch (error) {
      logger.error('Error getting upload statistics:', error);
      throw error;
    }
  }
}

module.exports = FileUploadService;