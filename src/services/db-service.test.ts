import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import Database from 'better-sqlite3';
import { DbService } from './db-service';
import type { FileEntry, FileRecord } from './file-service';

async function removeFile(path: string) {
  try {
    await fs.unlink(path);
  } catch {
    // ignore if file does not exist
  }
}

describe('DbService', () => {
  let dbPath: string;

  beforeEach(async () => {
    dbPath = join(tmpdir(), `db-service-test-${Date.now()}.sqlite`);
    await removeFile(dbPath);
  });

  afterEach(async () => {
    await removeFile(dbPath);
  });

  it('creates entries and records tables on construction', () => {
    new DbService(dbPath);

    const db = new Database(dbPath);
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('entries', 'records') ORDER BY name"
      )
      .all() as { name: string }[];

    expect(tables.map((t) => t.name)).toEqual(['entries', 'records']);

    const entriesColumns = db.prepare("PRAGMA table_info(entries)").all() as { name: string }[];
    const recordsColumns = db.prepare("PRAGMA table_info(records)").all() as { name: string }[];

    expect(entriesColumns.map((c) => c.name)).toEqual([
      'id',
      'size',
      'directory',
      'extension',
      'fileName',
      'createdAt',
      'hash',
    ]);

    expect(recordsColumns.map((c) => c.name)).toEqual(['id', 'fileName', 'hash', 'count', 'directories']);

    db.close();
  });

  it('inserts a FileEntry into entries table', () => {
    const service = new DbService(dbPath);

    const entry: FileEntry = {
      size: 123,
      directory: '/tmp',
      extension: '.png',
      path: '/tmp/foo.png',
      filename: 'foo.png',
      birthtime: new Date('2025-01-01T00:00:00.000Z'),
      hash: 'abc123',
    };

    service.insertFileInfo(entry);

    const db = new Database(dbPath);
    const rows = db.prepare('SELECT size, directory, extension, fileName, createdAt, hash FROM entries').all() as {
      size: number;
      directory: string;
      extension: string;
      fileName: string;
      createdAt: string;
      hash: string | null;
    }[];

    expect(rows.length).toBe(1);
    const row = rows[0];
    expect(row.size).toBe(entry.size);
    expect(row.directory).toBe(entry.directory);
    expect(row.extension).toBe(entry.extension);
    expect(row.fileName).toBe(entry.filename);
    expect(row.createdAt).toBe(entry.birthtime.toISOString());
    expect(row.hash).toBe(entry.hash);

    db.close();
  });

  it('inserts a FileRecord into records table', () => {
    const service = new DbService(dbPath);

    const record: FileRecord = {
      filename: 'bar.png',
      hash: 'def456',
      count: 2,
      directories: ['/tmp/a', '/tmp/b'],
    };

    service.insertFileRecord(record);

    const db = new Database(dbPath);
    const rows = db.prepare('SELECT fileName, hash, count, directories FROM records').all() as {
      fileName: string;
      hash: string;
      count: number;
      directories: string;
    }[];

    expect(rows.length).toBe(1);
    const row = rows[0];
    expect(row.fileName).toBe(record.filename);
    expect(row.hash).toBe(record.hash);
    expect(row.count).toBe(record.count);
    expect(JSON.parse(row.directories)).toEqual(record.directories);

    db.close();
  });
});

