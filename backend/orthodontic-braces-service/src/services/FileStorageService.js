const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const logger = require('../utils/logger');

class FileStorageService {
  constructor() {
    this.s3 = new AWS.S3({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
    
    this.bucketName = process.env.S3_BUCKET_NAME;
    
    if (!this.bucketName) {
      logger.warn('S3_BUCKET_NAME not configured, file storage will not work');
    }
  }

  async uploadFile(file, metadata = {}) {
    try {
      if (!this.bucketName) {
        throw new Error('S3 bucket not configured');
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      
      // Create S3 key with proper structure
      const s3Key = this.generateS3Key(fileName, metadata);

      const uploadParams = {
        Bucket: this.bucketName,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          uploadedBy: metadata.uploadedBy || 'unknown',
          caseId: metadata.caseId || '',
          type: metadata.type || '',
          uploadedAt: new Date().toISOString()
        },
        ServerSideEncryption: 'AES256'
      };

      const result = await this.s3.upload(uploadParams).promise();

      logger.info('File uploaded to S3', {
        fileName,
        s3Key,
        bucket: this.bucketName,
        size: file.size,
        contentType: file.mimetype
      });

      return {
        fileName,
        fileUrl: result.Location,
        s3Key: result.Key,
        etag: result.ETag
      };
    } catch (error) {
      logger.error('Error uploading file to S3:', error);
      throw error;
    }
  }

  async deleteFile(fileName) {
    try {
      if (!this.bucketName) {
        throw new Error('S3 bucket not configured');
      }

      // Find the file by searching for the filename in the key
      const listParams = {
        Bucket: this.bucketName,
        Prefix: 'orthodontic-measurements/'
      };

      const objects = await this.s3.listObjectsV2(listParams).promise();
      const fileObject = objects.Contents.find(obj => obj.Key.includes(fileName));

      if (!fileObject) {
        logger.warn('File not found for deletion', { fileName });
        return { success: false, message: 'File not found' };
      }

      const deleteParams = {
        Bucket: this.bucketName,
        Key: fileObject.Key
      };

      await this.s3.deleteObject(deleteParams).promise();

      logger.info('File deleted from S3', {
        fileName,
        s3Key: fileObject.Key
      });

      return { success: true };
    } catch (error) {
      logger.error('Error deleting file from S3:', error);
      throw error;
    }
  }

  async generateSignedUrl(fileName, expiresIn = 3600) {
    try {
      if (!this.bucketName) {
        throw new Error('S3 bucket not configured');
      }

      // Find the file by searching for the filename in the key
      const listParams = {
        Bucket: this.bucketName,
        Prefix: 'orthodontic-measurements/'
      };

      const objects = await this.s3.listObjectsV2(listParams).promise();
      const fileObject = objects.Contents.find(obj => obj.Key.includes(fileName));

      if (!fileObject) {
        throw new Error('File not found');
      }

      const signedUrlParams = {
        Bucket: this.bucketName,
        Key: fileObject.Key,
        Expires: expiresIn
      };

      const signedUrl = await this.s3.getSignedUrlPromise('getObject', signedUrlParams);

      logger.info('Signed URL generated', {
        fileName,
        s3Key: fileObject.Key,
        expiresIn
      });

      return signedUrl;
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      throw error;
    }
  }

  async getFileMetadata(fileName) {
    try {
      if (!this.bucketName) {
        throw new Error('S3 bucket not configured');
      }

      // Find the file by searching for the filename in the key
      const listParams = {
        Bucket: this.bucketName,
        Prefix: 'orthodontic-measurements/'
      };

      const objects = await this.s3.listObjectsV2(listParams).promise();
      const fileObject = objects.Contents.find(obj => obj.Key.includes(fileName));

      if (!fileObject) {
        throw new Error('File not found');
      }

      const headParams = {
        Bucket: this.bucketName,
        Key: fileObject.Key
      };

      const metadata = await this.s3.headObject(headParams).promise();

      return {
        fileName,
        s3Key: fileObject.Key,
        size: metadata.ContentLength,
        contentType: metadata.ContentType,
        lastModified: metadata.LastModified,
        etag: metadata.ETag,
        metadata: metadata.Metadata
      };
    } catch (error) {
      logger.error('Error getting file metadata:', error);
      throw error;
    }
  }

  async copyFile(sourceFileName, destinationFileName, metadata = {}) {
    try {
      if (!this.bucketName) {
        throw new Error('S3 bucket not configured');
      }

      // Find source file
      const listParams = {
        Bucket: this.bucketName,
        Prefix: 'orthodontic-measurements/'
      };

      const objects = await this.s3.listObjectsV2(listParams).promise();
      const sourceObject = objects.Contents.find(obj => obj.Key.includes(sourceFileName));

      if (!sourceObject) {
        throw new Error('Source file not found');
      }

      const destinationKey = this.generateS3Key(destinationFileName, metadata);

      const copyParams = {
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${sourceObject.Key}`,
        Key: destinationKey,
        MetadataDirective: 'REPLACE',
        Metadata: {
          ...metadata,
          copiedFrom: sourceFileName,
          copiedAt: new Date().toISOString()
        },
        ServerSideEncryption: 'AES256'
      };

      const result = await this.s3.copyObject(copyParams).promise();

      logger.info('File copied in S3', {
        sourceFileName,
        destinationFileName,
        sourceKey: sourceObject.Key,
        destinationKey
      });

      return {
        fileName: destinationFileName,
        s3Key: destinationKey,
        etag: result.CopyObjectResult.ETag
      };
    } catch (error) {
      logger.error('Error copying file in S3:', error);
      throw error;
    }
  }

  async listFiles(prefix = 'orthodontic-measurements/', maxKeys = 1000) {
    try {
      if (!this.bucketName) {
        throw new Error('S3 bucket not configured');
      }

      const listParams = {
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys
      };

      const result = await this.s3.listObjectsV2(listParams).promise();

      const files = result.Contents.map(obj => ({
        key: obj.Key,
        fileName: path.basename(obj.Key),
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag
      }));

      return {
        files,
        isTruncated: result.IsTruncated,
        nextContinuationToken: result.NextContinuationToken
      };
    } catch (error) {
      logger.error('Error listing files from S3:', error);
      throw error;
    }
  }

  async getStorageStatistics() {
    try {
      if (!this.bucketName) {
        throw new Error('S3 bucket not configured');
      }

      const listParams = {
        Bucket: this.bucketName,
        Prefix: 'orthodontic-measurements/'
      };

      let totalSize = 0;
      let fileCount = 0;
      let continuationToken = null;

      do {
        if (continuationToken) {
          listParams.ContinuationToken = continuationToken;
        }

        const result = await this.s3.listObjectsV2(listParams).promise();
        
        fileCount += result.Contents.length;
        totalSize += result.Contents.reduce((sum, obj) => sum + obj.Size, 0);
        
        continuationToken = result.NextContinuationToken;
      } while (continuationToken);

      return {
        totalFiles: fileCount,
        totalSizeBytes: totalSize,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        totalSizeGB: Math.round(totalSize / (1024 * 1024 * 1024) * 100) / 100
      };
    } catch (error) {
      logger.error('Error getting storage statistics:', error);
      throw error;
    }
  }

  // Helper methods
  generateS3Key(fileName, metadata = {}) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    let keyPath = `orthodontic-measurements/${year}/${month}/${day}`;
    
    if (metadata.caseId) {
      keyPath += `/${metadata.caseId}`;
    }
    
    if (metadata.type) {
      keyPath += `/${metadata.type}`;
    }
    
    return `${keyPath}/${fileName}`;
  }

  validateFileType(mimetype) {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/tiff',
      'application/pdf',
      'application/dicom',
      'model/stl',
      'model/obj',
      'application/octet-stream' // For some 3D model formats
    ];

    return allowedTypes.includes(mimetype);
  }

  validateFileSize(size, maxSizeBytes = 50 * 1024 * 1024) { // 50MB default
    return size <= maxSizeBytes;
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.bucketName) {
        return { healthy: false, message: 'S3 bucket not configured' };
      }

      // Try to list objects to check connectivity
      const listParams = {
        Bucket: this.bucketName,
        MaxKeys: 1
      };

      await this.s3.listObjectsV2(listParams).promise();

      return { healthy: true, message: 'S3 connection successful' };
    } catch (error) {
      logger.error('S3 health check failed:', error);
      return { 
        healthy: false, 
        message: `S3 connection failed: ${error.message}` 
      };
    }
  }
}

module.exports = FileStorageService;