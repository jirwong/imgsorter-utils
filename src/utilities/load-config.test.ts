import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadRunConfiguration } from './load-config';

async function makeTempDir(prefix = 'load-config-test-'): Promise<string> {
  return fs.mkdtemp(join(tmpdir(), prefix));
}

async function removeDirRecursive(path: string): Promise<void> {
  await fs.rm(path, { recursive: true, force: true });
}

describe('loadRunConfiguration', () => {
  let cwdBefore: string;
  let tempDir: string;

  beforeEach(async () => {
    cwdBefore = process.cwd();
    tempDir = await makeTempDir();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(cwdBefore);
    await removeDirRecursive(tempDir);
  });

  it('loads configuration from YAML file with required and optional fields', async () => {
    const yamlContent = `
      dbName: test.db
      directories:
        - ./images
        - ./more-images
      extensions:
        - .png
        - jpg
      update_records: true
      process_directories: false
      resync_directories: true
    `;

    await fs.writeFile(join(tempDir, 'config.yaml'), yamlContent, 'utf8');

    const config = await loadRunConfiguration('config.yaml');

    expect(config.dbName).toBe('test.db');
    expect(config.directories).toEqual(['./images', './more-images']);
    expect(config.extensions).toEqual(['.png', '.jpg']);
    expect(config.update_records).toBe(true);
    expect(config.process_directories).toBe(false);
    expect(config.resync_directories).toBe(true);
  });

  it('throws if update_records is not a boolean when provided', async () => {
    const yamlContent = `
      dbName: test.db
      directories:
        - ./images
      extensions: .png
      update_records: "yes"
    `;

    await fs.writeFile(join(tempDir, 'config.yaml'), yamlContent, 'utf8');

    await expect(loadRunConfiguration('config.yaml')).rejects.toThrow(
      'config.yaml: update_records must be a boolean if specified'
    );
  });

  it('throws if process_directories is not a boolean when provided', async () => {
    const yamlContent = `
      dbName: test.db
      directories:
        - ./images
      extensions: .png
      process_directories: 1
    `;

    await fs.writeFile(join(tempDir, 'config.yaml'), yamlContent, 'utf8');

    await expect(loadRunConfiguration('config.yaml')).rejects.toThrow(
      'config.yaml: process_directories must be a boolean if specified'
    );
  });

  it('throws if resync_directories is not a boolean when provided', async () => {
    const yamlContent = `
      dbName: test.db
      directories:
        - ./images
      extensions: .png
      resync_directories: "nope"
    `;

    await fs.writeFile(join(tempDir, 'config.yaml'), yamlContent, 'utf8');

    await expect(loadRunConfiguration('config.yaml')).rejects.toThrow(
      'config.yaml: resync_directories must be a boolean if specified'
    );
  });

  it('allows omitting optional boolean flags', async () => {
    const yamlContent = `
      dbName: test.db
      directories:
        - ./images
      extensions: .png
    `;

    await fs.writeFile(join(tempDir, 'config.yaml'), yamlContent, 'utf8');

    const config = await loadRunConfiguration('config.yaml');

    expect(config.update_records).toBeUndefined();
    expect(config.process_directories).toBeUndefined();
    expect(config.resync_directories).toBeUndefined();
  });
});
