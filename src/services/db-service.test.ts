import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import Database from 'better-sqlite3';
import { DbService } from './db-service';
import type { FileEntry, FileRecord } from '../types/file-types';

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
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('entries', 'records') ORDER BY name")
      .all() as { name: string }[];

    expect(tables.map((t) => t.name)).toEqual(['entries', 'records']);

    const entriesColumns = db.prepare('PRAGMA table_info(entries)').all() as { name: string }[];
    const recordsColumns = db.prepare('PRAGMA table_info(records)').all() as { name: string }[];

    expect(entriesColumns.map((c) => c.name)).toEqual([
      'id',
      'size',
      'directory',
      'extension',
      'filename',
      'birthtime',
      'hash',
      'path',
    ]);

    expect(recordsColumns.map((c) => c.name)).toEqual(['id', 'filename', 'hash', 'count', 'directories']);

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
    const rows = db.prepare('SELECT size, directory, extension, filename, birthtime, hash FROM entries').all() as {
      size: number;
      directory: string;
      extension: string;
      filename: string;
      birthtime: string;
      hash: string | null;
    }[];

    expect(rows.length).toBe(1);
    const row = rows[0];
    expect(row.size).toBe(entry.size);
    expect(row.directory).toBe(entry.directory);
    expect(row.extension).toBe(entry.extension);
    expect(row.filename).toBe(entry.filename);
    expect(row.birthtime).toBe(entry.birthtime.toISOString());
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
    const rows = db.prepare('SELECT filename, hash, count, directories FROM records').all() as {
      filename: string;
      hash: string;
      count: number;
      directories: string;
    }[];

    expect(rows.length).toBe(1);
    const row = rows[0];
    expect(row.filename).toBe(record.filename);
    expect(row.hash).toBe(record.hash);
    expect(row.count).toBe(record.count);
    expect(JSON.parse(row.directories)).toEqual(record.directories);

    db.close();
  });

  it('upserts a FileEntry when called with the same path', () => {
    const service = new DbService(dbPath);

    const original: FileEntry = {
      size: 123,
      directory: '/tmp',
      extension: '.png',
      path: '/tmp/foo.png',
      filename: 'foo.png',
      birthtime: new Date('2025-01-01T00:00:00.000Z'),
      hash: 'abc123',
    };

    const updated: FileEntry = {
      ...original,
      size: 456,
      hash: 'updated-hash',
      path: '/tmp/foo.png',
      birthtime: new Date('2026-02-02T00:00:00.000Z'),
    };

    service.insertFileInfo(original);
    service.insertFileInfo(updated);

    const db = new Database(dbPath);
    const rows = db
      .prepare('SELECT size, directory, extension, filename, birthtime, hash, path FROM entries')
      .all() as {
      size: number;
      directory: string;
      extension: string;
      filename: string;
      birthtime: string;
      hash: string | null;
      path: string;
    }[];

    expect(rows.length).toBe(1);
    const row = rows[0];
    expect(row.size).toBe(updated.size);
    expect(row.directory).toBe(updated.directory);
    expect(row.extension).toBe(updated.extension);
    expect(row.filename).toBe(updated.filename);
    expect(row.birthtime).toBe(updated.birthtime.toISOString());
    expect(row.hash).toBe(updated.hash);
    expect(row.path).toBe(updated.path);

    db.close();
  });

  it('upserts a FileRecord when called with the same filename and hash', () => {
    const service = new DbService(dbPath);

    const original: FileRecord = {
      filename: 'baz.png',
      hash: 'ghi789',
      count: 1,
      directories: ['/tmp/x'],
    };

    const updated: FileRecord = {
      ...original,
      count: 3,
      directories: ['/tmp/x', '/tmp/y'],
    };

    service.insertFileRecord(original);
    service.insertFileRecord(updated);

    const db = new Database(dbPath);
    const rows = db.prepare('SELECT filename, hash, count, directories FROM records').all() as {
      filename: string;
      hash: string;
      count: number;
      directories: string;
    }[];

    expect(rows.length).toBe(1);
    const row = rows[0];
    expect(row.filename).toBe(updated.filename);
    expect(row.hash).toBe(updated.hash);
    expect(row.count).toBe(updated.count);
    expect(JSON.parse(row.directories)).toEqual(updated.directories);

    db.close();
  });

  it('returns all file entries from the entries table via getFileEntries', () => {
    const service = new DbService(dbPath);

    const entry1: FileEntry = {
      size: 100,
      directory: '/tmp/a',
      extension: '.txt',
      path: '/tmp/a/foo.txt',
      filename: 'foo.txt',
      birthtime: new Date('2025-01-01T00:00:00.000Z'),
      hash: 'hash-1',
    };

    const entry2: FileEntry = {
      size: 200,
      directory: '/tmp/b',
      extension: '.log',
      path: '/tmp/b/bar.log',
      filename: 'bar.log',
      birthtime: new Date('2025-02-02T00:00:00.000Z'),
    };

    service.insertFileInfo(entry1);
    service.insertFileInfo(entry2);

    const entries = service.getFileEntries();

    expect(entries).toHaveLength(2);

    const byPath = new Map(entries.map((e) => [e.path, e]));

    const e1 = byPath.get(entry1.path)!;
    expect(e1.size).toBe(entry1.size);
    expect(e1.directory).toBe(entry1.directory);
    expect(e1.extension).toBe(entry1.extension);
    expect(e1.filename).toBe(entry1.filename);
    expect(e1.birthtime).toBe(entry1.birthtime.toISOString());
    expect(e1.hash).toBe(entry1.hash);
    expect(e1.path).toBe(entry1.path);

    const e2 = byPath.get(entry2.path)!;
    expect(e2.size).toBe(entry2.size);
    expect(e2.directory).toBe(entry2.directory);
    expect(e2.extension).toBe(entry2.extension);
    expect(e2.filename).toBe(entry2.filename);
    expect(e2.birthtime).toBe(entry2.birthtime.toISOString());
    expect(e2.hash).toBeNull();
    expect(e2.path).toBe(entry2.path);
  });
});
