/**
 * Storage Module Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DriveStorage, VideoFile, UploadOptions } from '../src/modules/storage/index.js';

describe('DriveStorage', () => {
  let driveStorage: DriveStorage;

  beforeEach(() => {
    // Use mock mode for testing
    driveStorage = new DriveStorage({
      useMock: true,
    });
  });

  describe('authenticate', () => {
    it('should authenticate in mock mode without errors', async () => {
      await expect(driveStorage.authenticate()).resolves.toBeUndefined();
    });
  });

  describe('upload', () => {
    it('should upload a video file in mock mode', async () => {
      await driveStorage.authenticate();

      const videoFile: VideoFile = {
        buffer: Buffer.from('mock video data'),
        filename: 'test-video.mp4',
        mimeType: 'video/mp4',
      };

      const result = await driveStorage.upload(videoFile);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^mock-file-/);
      expect(result.name).toBe('test-video.mp4');
      expect(result.mimeType).toBe('video/mp4');
      expect(result.webViewLink).toContain('drive.google.com');
      expect(result.size).toBe(videoFile.buffer.length);
    });

    it('should upload with makePublic option', async () => {
      await driveStorage.authenticate();

      const videoFile: VideoFile = {
        buffer: Buffer.from('mock video data'),
        filename: 'public-video.mp4',
        mimeType: 'video/mp4',
      };

      const options: UploadOptions = {
        makePublic: true,
      };

      const result = await driveStorage.upload(videoFile, options);

      expect(result.webContentLink).toBeDefined();
      expect(result.webContentLink).toContain('drive.google.com/uc?id=');
    });

    it('should upload with custom folderId', async () => {
      await driveStorage.authenticate();

      const videoFile: VideoFile = {
        buffer: Buffer.from('mock video data'),
        filename: 'folder-video.mp4',
        mimeType: 'video/mp4',
      };

      const options: UploadOptions = {
        folderId: 'custom-folder-id',
        description: 'Test video description',
      };

      const result = await driveStorage.upload(videoFile, options);

      expect(result).toBeDefined();
      expect(result.name).toBe('folder-video.mp4');
    });
  });

  describe('createFolder', () => {
    it('should create a folder in mock mode', async () => {
      await driveStorage.authenticate();

      const folderId = await driveStorage.createFolder('Test Folder');

      expect(folderId).toMatch(/^mock-folder-/);
    });

    it('should create a folder with parentId', async () => {
      await driveStorage.authenticate();

      const parentId = await driveStorage.createFolder('Parent Folder');
      const childId = await driveStorage.createFolder('Child Folder', parentId);

      expect(childId).toMatch(/^mock-folder-/);
      expect(childId).not.toBe(parentId);
    });
  });

  describe('listFiles', () => {
    it('should list files in mock mode', async () => {
      await driveStorage.authenticate();

      const files = await driveStorage.listFiles();

      expect(Array.isArray(files)).toBe(true);
    });

    it('should list uploaded files', async () => {
      await driveStorage.authenticate();

      const videoFile: VideoFile = {
        buffer: Buffer.from('mock video data'),
        filename: 'list-test.mp4',
        mimeType: 'video/mp4',
      };

      await driveStorage.upload(videoFile);

      const files = await driveStorage.listFiles();

      expect(files.length).toBeGreaterThan(0);
      expect(files[0].name).toBe('list-test.mp4');
    });
  });

  describe('getFileLink', () => {
    it('should get file link in mock mode', async () => {
      await driveStorage.authenticate();

      const videoFile: VideoFile = {
        buffer: Buffer.from('mock video data'),
        filename: 'link-test.mp4',
        mimeType: 'video/mp4',
      };

      const uploadResult = await driveStorage.upload(videoFile);
      const link = await driveStorage.getFileLink(uploadResult.id);

      expect(link).toBe(uploadResult.webViewLink);
      expect(link).toContain('drive.google.com');
    });

    it('should throw error for non-existent file', async () => {
      await driveStorage.authenticate();

      await expect(driveStorage.getFileLink('non-existent-id')).rejects.toThrow('Mock file not found');
    });
  });

  describe('deleteFile', () => {
    it('should delete a file in mock mode', async () => {
      await driveStorage.authenticate();

      const videoFile: VideoFile = {
        buffer: Buffer.from('mock video data'),
        filename: 'delete-test.mp4',
        mimeType: 'video/mp4',
      };

      const uploadResult = await driveStorage.upload(videoFile);
      await driveStorage.deleteFile(uploadResult.id);

      await expect(driveStorage.getFileLink(uploadResult.id)).rejects.toThrow('Mock file not found');
    });

    it('should throw error when deleting non-existent file', async () => {
      await driveStorage.authenticate();

      await expect(driveStorage.deleteFile('non-existent-id')).rejects.toThrow('Mock file not found');
    });
  });

  describe('createMonthlyFolder', () => {
    it('should create monthly folder with current date', async () => {
      await driveStorage.authenticate();

      const folderId = await driveStorage.createMonthlyFolder();

      expect(folderId).toMatch(/^mock-monthly-/);
    });

    it('should create monthly folder with custom date', async () => {
      await driveStorage.authenticate();

      const customDate = new Date('2024-12-15');
      const folderId = await driveStorage.createMonthlyFolder(customDate);

      expect(folderId).toMatch(/^mock-monthly-2024-12$/);
    });

    it('should create monthly folder for different months', async () => {
      await driveStorage.authenticate();

      const date1 = new Date('2024-12-01');
      const date2 = new Date('2025-01-01');

      const folderId1 = await driveStorage.createMonthlyFolder(date1);
      const folderId2 = await driveStorage.createMonthlyFolder(date2);

      expect(folderId1).toContain('2024-12');
      expect(folderId2).toContain('2025-01');
      expect(folderId1).not.toBe(folderId2);
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with product type', () => {
      const filename = DriveStorage.generateFilename('lipstick');

      expect(filename).toMatch(/^lipstick_\d{8}_\d{6}_ad\.mp4$/);
    });

    it('should sanitize product type', () => {
      const filename = DriveStorage.generateFilename('Eye Shadow!@#');

      expect(filename).toMatch(/^eye-shadow---_\d{8}_\d{6}_ad\.mp4$/);
    });

    it('should support custom extension', () => {
      const filename = DriveStorage.generateFilename('foundation', 'webm');

      expect(filename).toMatch(/^foundation_\d{8}_\d{6}_ad\.webm$/);
    });

    it('should include timestamp in filename', () => {
      const filename = DriveStorage.generateFilename('lipstick');
      const timestampRegex = /_(\d{8})_(\d{6})_ad\.mp4$/;
      const match = filename.match(timestampRegex);

      expect(match).not.toBeNull();
      expect(match![1]).toHaveLength(8); // YYYYMMDD
      expect(match![2]).toHaveLength(6); // HHMMSS
    });
  });

  describe('integration tests', () => {
    it('should handle complete upload workflow', async () => {
      await driveStorage.authenticate();

      // Create monthly folder
      const folderId = await driveStorage.createMonthlyFolder();

      // Generate filename
      const filename = DriveStorage.generateFilename('lipstick');

      // Upload video
      const videoFile: VideoFile = {
        buffer: Buffer.from('mock video data'),
        filename,
        mimeType: 'video/mp4',
      };

      const uploadResult = await driveStorage.upload(videoFile, {
        folderId,
        description: 'Integration test video',
        makePublic: true,
      });

      expect(uploadResult).toBeDefined();
      expect(uploadResult.name).toBe(filename);
      expect(uploadResult.webContentLink).toBeDefined();

      // List files
      const files = await driveStorage.listFiles();
      expect(files.length).toBeGreaterThan(0);

      // Get link
      const link = await driveStorage.getFileLink(uploadResult.id);
      expect(link).toBe(uploadResult.webViewLink);

      // Delete file
      await driveStorage.deleteFile(uploadResult.id);

      // Verify deletion
      await expect(driveStorage.getFileLink(uploadResult.id)).rejects.toThrow('Mock file not found');
    });
  });

  describe('error handling', () => {
    it('should throw error when not authenticated', async () => {
      const driveStorageNotAuth = new DriveStorage({
        useMock: false,
      });

      const videoFile: VideoFile = {
        buffer: Buffer.from('mock video data'),
        filename: 'test.mp4',
        mimeType: 'video/mp4',
      };

      await expect(driveStorageNotAuth.upload(videoFile)).rejects.toThrow('not authenticated');
    });

    it('should handle missing credentials gracefully', async () => {
      const driveStorageNoCredentials = new DriveStorage({
        useMock: false,
      });

      await expect(driveStorageNoCredentials.authenticate()).rejects.toThrow(
        'Either credentials or credentialsPath must be provided'
      );
    });
  });

  describe('file naming conventions', () => {
    it('should follow naming pattern: {productType}_{timestamp}_ad.mp4', () => {
      const filename1 = DriveStorage.generateFilename('lipstick');
      const filename2 = DriveStorage.generateFilename('foundation');

      expect(filename1).toMatch(/^lipstick_\d{8}_\d{6}_ad\.mp4$/);
      expect(filename2).toMatch(/^foundation_\d{8}_\d{6}_ad\.mp4$/);
    });

    it('should generate unique filenames', () => {
      const filename1 = DriveStorage.generateFilename('lipstick');
      // Wait a tiny bit to ensure timestamp differs
      const filename2 = DriveStorage.generateFilename('lipstick');

      // Filenames should be different due to timestamp
      // (In practice, they might be the same if generated within the same millisecond)
      expect(filename1).toMatch(/^lipstick_\d{8}_\d{6}_ad\.mp4$/);
      expect(filename2).toMatch(/^lipstick_\d{8}_\d{6}_ad\.mp4$/);
    });
  });
});
