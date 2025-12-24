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
      updateRecords: true
      processDirectories: false
    `;

    await fs.writeFile(join(tempDir, 'config.yaml'), yamlContent, 'utf8');

    const config = await loadRunConfiguration('config.yaml');

    expect(config.dbName).toBe('test.db');
    expect(config.directories).toEqual(['./images', './more-images']);
    expect(config.extensions).toEqual(['.png', '.jpg']);
    expect(config.updateRecords).toBe(true);
    expect(config.processDirectories).toBe(false);
  });

  it('throws if updateRecords is not a boolean when provided', async () => {
    const yamlContent = `
      dbName: test.db
      directories:
        - ./images
      extensions: .png
      updateRecords: "yes"
    `;

    await fs.writeFile(join(tempDir, 'config.yaml'), yamlContent, 'utf8');

    await expect(loadRunConfiguration('config.yaml')).rejects.toThrow(
      'config.yaml: updateRecords must be a boolean if specified',
    );
  });

  it('throws if processDirectories is not a boolean when provided', async () => {
    const yamlContent = `
      dbName: test.db
      directories:
        - ./images
      extensions: .png
      processDirectories: 1
    `;

    await fs.writeFile(join(tempDir, 'config.yaml'), yamlContent, 'utf8');

    await expect(loadRunConfiguration('config.yaml')).rejects.toThrow(
      'config.yaml: processDirectories must be a boolean if specified',
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

    expect(config.updateRecords).toBeUndefined();
    expect(config.processDirectories).toBeUndefined();
  });
});

