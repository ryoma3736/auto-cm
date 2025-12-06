/**
 * Storage Module
 * Manages file storage and Google Drive uploads
 */

import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

// ========== Type Definitions ==========

export interface VideoFile {
  buffer: Buffer;
  filename: string;
  mimeType: 'video/mp4' | 'video/webm';
}

export interface UploadOptions {
  folderId?: string;
  description?: string;
  makePublic?: boolean;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  webContentLink?: string;
  size: number;
  createdTime: string;
}

export interface DriveStorageOptions {
  credentialsPath?: string;
  credentials?: object;  // サービスアカウントJSONオブジェクト
  rootFolderId?: string;
  useMock?: boolean;
}

export interface StorageConfig {
  googleDriveCredentialsPath: string;
  outputDirectory: string;
  tempDirectory: string;
}

export interface UploadResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
  size: number;
}

// ========== DriveStorage Class ==========

export class DriveStorage {
  private drive: drive_v3.Drive | null = null;
  private rootFolderId?: string;
  private useMock: boolean;
  private mockFiles: Map<string, DriveFile> = new Map();
  private mockIdCounter = 0;

  constructor(private options: DriveStorageOptions) {
    this.rootFolderId = options.rootFolderId;
    this.useMock = options.useMock || false;
  }

  /**
   * Authenticate with Google Drive API
   */
  async authenticate(): Promise<void> {
    if (this.useMock) {
      console.log('[Mock] DriveStorage authenticated');
      return;
    }

    try {
      let credentials: object;

      if (this.options.credentials) {
        credentials = this.options.credentials;
      } else if (this.options.credentialsPath) {
        const credentialsPath = path.resolve(this.options.credentialsPath);

        if (!fs.existsSync(credentialsPath)) {
          throw new Error(`Credentials file not found: ${credentialsPath}`);
        }

        const credentialsContent = fs.readFileSync(credentialsPath, 'utf-8');
        credentials = JSON.parse(credentialsContent);
      } else {
        throw new Error('Either credentials or credentialsPath must be provided');
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      this.drive = google.drive({ version: 'v3', auth });
      console.log('✅ Google Drive API authenticated');
    } catch (error) {
      throw new Error(`Failed to authenticate Google Drive: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Upload video file to Google Drive
   */
  async upload(video: VideoFile, options?: UploadOptions): Promise<DriveFile> {
    if (this.useMock) {
      return this.mockUpload(video, options);
    }

    if (!this.drive) {
      throw new Error('DriveStorage not authenticated. Call authenticate() first.');
    }

    try {
      const folderId = options?.folderId || this.rootFolderId;
      const requestBody: drive_v3.Schema$File = {
        name: video.filename,
        mimeType: video.mimeType,
      };

      if (folderId) {
        requestBody.parents = [folderId];
      }

      if (options?.description) {
        requestBody.description = options.description;
      }

      const media = {
        mimeType: video.mimeType,
        body: Readable.from(video.buffer),
      };

      const response = await this.drive.files.create({
        requestBody,
        media,
        fields: 'id, name, mimeType, webViewLink, webContentLink, size, createdTime',
      });

      const file = response.data;

      if (!file.id) {
        throw new Error('Failed to get file ID from upload response');
      }

      // Make file public if requested
      if (options?.makePublic) {
        await this.drive.permissions.create({
          fileId: file.id,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      }

      // Fetch complete file metadata
      const fileMetadata = await this.drive.files.get({
        fileId: file.id,
        fields: 'id, name, mimeType, webViewLink, webContentLink, size, createdTime',
      });

      return {
        id: fileMetadata.data.id!,
        name: fileMetadata.data.name!,
        mimeType: fileMetadata.data.mimeType!,
        webViewLink: fileMetadata.data.webViewLink!,
        webContentLink: fileMetadata.data.webContentLink || undefined,
        size: parseInt(fileMetadata.data.size || '0', 10),
        createdTime: fileMetadata.data.createdTime!,
      };
    } catch (error) {
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a folder in Google Drive
   */
  async createFolder(name: string, parentId?: string): Promise<string> {
    if (this.useMock) {
      const folderId = `mock-folder-${Date.now()}-${this.mockIdCounter++}`;
      console.log(`[Mock] Created folder: ${name} (ID: ${folderId})`);
      return folderId;
    }

    if (!this.drive) {
      throw new Error('DriveStorage not authenticated. Call authenticate() first.');
    }

    try {
      const requestBody: drive_v3.Schema$File = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
      };

      if (parentId || this.rootFolderId) {
        requestBody.parents = [parentId || this.rootFolderId!];
      }

      const response = await this.drive.files.create({
        requestBody,
        fields: 'id',
      });

      if (!response.data.id) {
        throw new Error('Failed to get folder ID from creation response');
      }

      console.log(`✅ Created folder: ${name} (ID: ${response.data.id})`);
      return response.data.id;
    } catch (error) {
      throw new Error(`Failed to create folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List files in a Google Drive folder
   */
  async listFiles(folderId?: string): Promise<DriveFile[]> {
    if (this.useMock) {
      return Array.from(this.mockFiles.values());
    }

    if (!this.drive) {
      throw new Error('DriveStorage not authenticated. Call authenticate() first.');
    }

    try {
      const targetFolderId = folderId || this.rootFolderId;
      const query = targetFolderId ? `'${targetFolderId}' in parents and trashed=false` : 'trashed=false';

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, webViewLink, webContentLink, size, createdTime)',
        orderBy: 'createdTime desc',
      });

      if (!response.data.files) {
        return [];
      }

      return response.data.files.map((file) => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        webViewLink: file.webViewLink!,
        webContentLink: file.webContentLink || undefined,
        size: parseInt(file.size || '0', 10),
        createdTime: file.createdTime!,
      }));
    } catch (error) {
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get public link for a file
   */
  async getFileLink(fileId: string): Promise<string> {
    if (this.useMock) {
      const mockFile = this.mockFiles.get(fileId);
      if (!mockFile) {
        throw new Error(`Mock file not found: ${fileId}`);
      }
      return mockFile.webViewLink;
    }

    if (!this.drive) {
      throw new Error('DriveStorage not authenticated. Call authenticate() first.');
    }

    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'webViewLink, webContentLink',
      });

      return response.data.webViewLink || response.data.webContentLink || '';
    } catch (error) {
      throw new Error(`Failed to get file link: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a file from Google Drive
   */
  async deleteFile(fileId: string): Promise<void> {
    if (this.useMock) {
      const deleted = this.mockFiles.delete(fileId);
      if (!deleted) {
        throw new Error(`Mock file not found: ${fileId}`);
      }
      console.log(`[Mock] Deleted file: ${fileId}`);
      return;
    }

    if (!this.drive) {
      throw new Error('DriveStorage not authenticated. Call authenticate() first.');
    }

    try {
      await this.drive.files.delete({
        fileId,
      });
      console.log(`✅ Deleted file: ${fileId}`);
    } catch (error) {
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create monthly folder structure
   * Format: Auto-CM-Videos/YYYY-MM/
   */
  async createMonthlyFolder(date: Date = new Date()): Promise<string> {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const folderName = `${year}-${month}`;

    if (this.useMock) {
      const folderId = `mock-monthly-${folderName}`;
      console.log(`[Mock] Created monthly folder: ${folderName}`);
      return folderId;
    }

    // Check if root folder exists, create if not
    let rootId = this.rootFolderId;
    if (!rootId) {
      rootId = await this.createFolder('Auto-CM-Videos');
      this.rootFolderId = rootId;
    }

    // Check if monthly folder exists
    const existingFolders = await this.listFiles(rootId);
    const existingFolder = existingFolders.find(
      (file) => file.name === folderName && file.mimeType === 'application/vnd.google-apps.folder'
    );

    if (existingFolder) {
      console.log(`📁 Monthly folder already exists: ${folderName}`);
      return existingFolder.id;
    }

    // Create monthly folder
    return await this.createFolder(folderName, rootId);
  }

  /**
   * Generate filename for video
   * Format: {productType}_{timestamp}_ad.mp4
   */
  static generateFilename(productType: string, extension = 'mp4'): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
    const sanitizedProductType = productType.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${sanitizedProductType}_${timestamp}_ad.${extension}`;
  }

  // ========== Mock Implementation ==========

  private mockUpload(video: VideoFile, options?: UploadOptions): DriveFile {
    const fileId = `mock-file-${Date.now()}-${this.mockIdCounter++}`;
    const mockFile: DriveFile = {
      id: fileId,
      name: video.filename,
      mimeType: video.mimeType,
      webViewLink: `https://drive.google.com/file/d/${fileId}/view`,
      webContentLink: options?.makePublic ? `https://drive.google.com/uc?id=${fileId}` : undefined,
      size: video.buffer.length,
      createdTime: new Date().toISOString(),
    };

    this.mockFiles.set(fileId, mockFile);
    console.log(`[Mock] Uploaded file: ${video.filename} (ID: ${fileId})`);
    return mockFile;
  }
}

// ========== Storage Class (Legacy Compatibility) ==========

export class Storage {
  private config: StorageConfig;
  private driveStorage: DriveStorage | null = null;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  /**
   * Initialize storage directories
   */
  async initialize(): Promise<void> {
    // Create output directory
    if (!fs.existsSync(this.config.outputDirectory)) {
      fs.mkdirSync(this.config.outputDirectory, { recursive: true });
      console.log(`✅ Created output directory: ${this.config.outputDirectory}`);
    }

    // Create temp directory
    if (!fs.existsSync(this.config.tempDirectory)) {
      fs.mkdirSync(this.config.tempDirectory, { recursive: true });
      console.log(`✅ Created temp directory: ${this.config.tempDirectory}`);
    }

    // Initialize DriveStorage if credentials are available
    if (this.config.googleDriveCredentialsPath) {
      this.driveStorage = new DriveStorage({
        credentialsPath: this.config.googleDriveCredentialsPath,
      });
      await this.driveStorage.authenticate();
    }
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadToGoogleDrive(
    filePath: string,
    fileName: string,
    folderId?: string
  ): Promise<UploadResult> {
    if (!this.driveStorage) {
      throw new Error('DriveStorage not initialized. Check credentials configuration.');
    }

    // Read file
    const buffer = fs.readFileSync(filePath);
    const mimeType = fileName.endsWith('.webm') ? 'video/webm' : 'video/mp4';

    const videoFile: VideoFile = {
      buffer,
      filename: fileName,
      mimeType: mimeType as 'video/mp4' | 'video/webm',
    };

    const uploadOptions: UploadOptions = {
      folderId,
      makePublic: true,
    };

    const result = await this.driveStorage.upload(videoFile, uploadOptions);

    return {
      fileId: result.id,
      fileName: result.name,
      webViewLink: result.webViewLink,
      size: result.size,
    };
  }

  /**
   * List files in Google Drive folder
   */
  async listFiles(folderId?: string): Promise<Array<{ id: string; name: string; size: number }>> {
    if (!this.driveStorage) {
      throw new Error('DriveStorage not initialized. Check credentials configuration.');
    }

    const files = await this.driveStorage.listFiles(folderId);
    return files.map((file) => ({
      id: file.id,
      name: file.name,
      size: file.size,
    }));
  }

  /**
   * Delete a file from Google Drive
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!this.driveStorage) {
      throw new Error('DriveStorage not initialized. Check credentials configuration.');
    }

    await this.driveStorage.deleteFile(fileId);
  }

  /**
   * Clean up temporary files
   */
  async cleanupTemp(): Promise<void> {
    if (!fs.existsSync(this.config.tempDirectory)) {
      return;
    }

    const files = fs.readdirSync(this.config.tempDirectory);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(this.config.tempDirectory, file);
      try {
        fs.unlinkSync(filePath);
        deletedCount++;
      } catch (error) {
        console.warn(`Failed to delete temp file: ${filePath}`, error);
      }
    }

    if (deletedCount > 0) {
      console.log(`✅ Cleaned up ${deletedCount} temporary file(s)`);
    }
  }
}
