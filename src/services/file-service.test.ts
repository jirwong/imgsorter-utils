import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, extname, basename } from 'node:path';
import { fileService } from './file-service';
import type { FileEntry } from '../types/file-types';
import { createHash } from 'node:crypto';

// Tests for fileService
// - use only temporary fixtures created at runtime
// - cover happy and error paths for readFile, getHashEdges, listFilesRecursive
// - verify case-insensitive extension filtering from the API perspective

async function makeTempDir(prefix = 'file-service-test-'): Promise<string> {
  return fs.mkdtemp(join(tmpdir(), prefix));
}

async function removeDirRecursive(path: string): Promise<void> {
  // Node 18+: fs.rm supports recursive option
  await fs.rm(path, { recursive: true, force: true });
}

async function createFile(root: string, relativePath: string, content: string): Promise<string> {
  const fullPath = join(root, relativePath);
  const dir = dirname(fullPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(fullPath, content);
  return fullPath;
}

describe('fileService', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await makeTempDir();
  });

  afterEach(async () => {
    await removeDirRecursive(rootDir);
  });

  describe('readFile', () => {
    it('returns file info for an existing file', async () => {
      const filePath = await createFile(rootDir, 'images/sample.PNG', 'hello world');

      const info = (await fileService.readFileInfo(filePath)) as FileEntry;

      const stats = await fs.stat(filePath);

      expect(info.filename).toBe(basename(filePath));
      expect(info.directory).toBe(dirname(filePath));
      expect(info.extension).toBe(extname(filePath));
      expect(info.size).toBe(stats.size);
      expect(info.birthtime).toBeInstanceOf(Date);
    });

    it('throws when file does not exist', async () => {
      const nonExistent = join(rootDir, 'does-not-exist.png');
      await expect(fileService.readFileInfo(nonExistent)).rejects.toThrow();
    });
  });

  describe('getHashEdges', () => {
    function computeExpectedEdgeHash(content: Buffer | string, edgeSize: number): string {
      const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
      const size = buf.length;
      const firstLen = Math.min(edgeSize, size);
      const lastLen = Math.min(edgeSize, Math.max(0, size - firstLen));

      const hash = createHash('sha256');

      if (firstLen > 0) {
        hash.update(buf.subarray(0, firstLen));
      }
      if (lastLen > 0) {
        const start = size - lastLen;
        hash.update(buf.subarray(start, start + lastLen));
      }

      return hash.digest('hex');
    }

    it('produces a deterministic hash for a small file (<16KB)', async () => {
      const content = 'small file content';
      const filePath = await createFile(rootDir, 'files/small.txt', content);

      const hash = await fileService.getHashEdges(filePath);
      expect(hash).toBe(computeExpectedEdgeHash(content, 16 * 1024));
    });

    it('produces different hashes for files with different content', async () => {
      const contentA = 'AAA'.repeat(1000);
      const contentB = 'BBB'.repeat(1000);
      const fileA = await createFile(rootDir, 'files/a.bin', contentA);
      const fileB = await createFile(rootDir, 'files/b.bin', contentB);

      const hashA = await fileService.getHashEdges(fileA);
      const hashB = await fileService.getHashEdges(fileB);

      expect(hashA).not.toBe(hashB);
    });

    it('throws when file does not exist', async () => {
      const nonExistent = join(rootDir, 'missing.bin');
      await expect(fileService.getHashEdges(nonExistent)).rejects.toThrow();
    });
  });

  describe('listFilesRecursive', () => {
    it('lists all files in nested directories', async () => {
      const file1 = await createFile(rootDir, 'a/photo1.jpg', 'one');
      const file2 = await createFile(rootDir, 'a/b/photo2.JPG', 'two');
      const file3 = await createFile(rootDir, 'c/note.txt', 'three');

      const files = await fileService.listFilesRecursive(rootDir);
      const paths = files.map((f) => join(f.directory, f.filename));

      expect(paths).toContain(file1);
      expect(paths).toContain(file2);
      expect(paths).toContain(file3);
    });

    it('filters by extensions in a case-insensitive way', async () => {
      const jpgLower = await createFile(rootDir, 'images/pic1.jpg', 'jpg-lower');
      const jpgUpper = await createFile(rootDir, 'images/pic2.JPG', 'jpg-upper');
      const pngMixed = await createFile(rootDir, 'images/pic3.PnG', 'png-mixed');
      await createFile(rootDir, 'images/readme.txt', 'text');

      const files = await fileService.listFilesRecursive(rootDir, ['.JPG', '.pNg']);
      const paths = files.map((f) => join(f.directory, f.filename));

      expect(paths).toContain(jpgLower);
      expect(paths).toContain(jpgUpper);
      expect(paths).toContain(pngMixed);
      expect(paths.length).toBe(3);
    });

    it('returns an empty array when no files match the given extensions', async () => {
      await createFile(rootDir, 'images/pic1.jpg', 'jpg-lower');

      const files = await fileService.listFilesRecursive(rootDir, ['.txt']);
      expect(files.length).toBe(0);
    });
  });
});
