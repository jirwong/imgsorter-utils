import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { FileEntry, FileRecord } from './file-service';

export class DbService {
  private db: DatabaseType;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.createTables();
  }

  getDb() {
    return this.db;
  }

  private createTables() {
    // formatter: off
    this.db
      .prepare(
        `
    CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        size INTEGER,
        directory TEXT,
        extension TEXT,
        fileName TEXT,
        createdAt TEXT,
        hash TEXT
    )`
      )
      .run();
    // formatter: on

    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_entries_fileName ON entries (fileName)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_entries_hash ON entries (hash)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_entries_directory ON entries (directory)`).run();

    // formatter: off
    this.db
      .prepare(
        `
    CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fileName TEXT,
        hash TEXT,
        count INTEGER,
        directories TEXT
    )`
      )
      .run();
    // formatter: on

    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_records_fileName ON records (fileName)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_records_hash ON records (hash)`).run();
  }

  insertFileInfo(fileInfo: FileEntry) {
    const insertSql = this.db.prepare(
      `INSERT INTO entries (size, directory, extension, fileName, createdAt, hash)
       VALUES (@size, @directory, @extension, @fileName, @createdAt, @hash)`
    );
    insertSql.run({
      size: fileInfo.size,
      directory: fileInfo.directory,
      extension: fileInfo.extension,
      fileName: fileInfo.filename,
      createdAt: fileInfo.birthtime.toISOString(),
      hash: fileInfo.hash ?? null,
    });
  }

  insertFileRecord(fileRecord: FileRecord) {
    const insertSql = this.db.prepare(
      `INSERT INTO records (fileName, hash, count, directories)
       VALUES (@fileName, @hash, @count, @directories)`
    );
    insertSql.run({
      fileName: fileRecord.filename,
      hash: fileRecord.hash,
      count: fileRecord.count,
      directories: JSON.stringify(fileRecord.directories),
    });
  }
}
