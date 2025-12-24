import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { FileEntry, FileRecord } from '../types/file-types';

export class DbService {
  private db: DatabaseType;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);

    this.db.pragma('journal_mode = WAL');

    this.createTables();
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
        filename TEXT,
        birthtime TEXT,
        hash TEXT,
        path TEXT,
        UNIQUE(path)
    )`
      )
      .run();
    // formatter: on

    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_entries_filename ON entries (filename)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_entries_hash ON entries (hash)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_entries_directory ON entries (directory)`).run();

    // formatter: off
    this.db
      .prepare(
        `
    CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        hash TEXT,
        count INTEGER,
        directories TEXT,
        UNIQUE(filename, hash)
    )`
      )
      .run();
    // formatter: on

    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_records_filename ON records (filename)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_records_hash ON records (hash)`).run();
  }

  insertFileInfo(fileInfo: FileEntry) {
    const insertSql = this.db.prepare(
      `INSERT INTO entries (size, directory, extension, filename, birthtime, hash, path)
       VALUES (@size, @directory, @extension, @filename, @birthtime, @hash, @path)
       ON CONFLICT(path) DO UPDATE SET
         size = excluded.size,
         extension = excluded.extension,
         birthtime = excluded.birthtime,
         hash = excluded.hash,
         filename = excluded.filename,
         directory = excluded.directory`
    );
    insertSql.run({
      size: fileInfo.size,
      directory: fileInfo.directory,
      extension: fileInfo.extension,
      filename: fileInfo.filename,
      birthtime: fileInfo.birthtime.toISOString(),
      hash: fileInfo.hash ?? null,
      path: fileInfo.path,
    });
  }

  insertFileRecord(fileRecord: FileRecord) {
    const insertSql = this.db.prepare(
      `INSERT INTO records (filename, hash, count, directories)
       VALUES (@filename, @hash, @count, @directories)
       ON CONFLICT(filename, hash) DO UPDATE SET
         count = excluded.count,
         directories = excluded.directories`
    );
    insertSql.run({
      filename: fileRecord.filename,
      hash: fileRecord.hash,
      count: fileRecord.count,
      directories: JSON.stringify(fileRecord.directories),
    });
  }

  updateFileRecords() {
    const dedupSql = `select hash,
              filename,
              json_group_array(distinct directory) as directories,
              count(*)                             as row_count
       from entries
       group by hash, filename
       order by filename;
      `;

    const rows = this.db.prepare(dedupSql).all() as {
      hash: string;
      filename: string;
      directories: string;
      row_count: number;
    }[];

    for (const row of rows) {
      const record: FileRecord = {
        filename: row.filename,
        hash: row.hash,
        count: row.row_count,
        directories: JSON.parse(row.directories) as string[],
      };

      console.log('Updating record for hash:', record.hash, 'filename:', record.filename);

      this.insertFileRecord(record);
    }
  }

  getFileEntries() {
    const selectSql = `SELECT size, directory, extension, filename, birthtime, hash, path FROM entries`;
    return this.db.prepare(selectSql).all() as FileEntry[];
  }

  getFileEntriesByDirectory(directory: string) {
    // Use LIKE so callers can pass a prefix (e.g. 'C:\\Jir%') to match subdirectories.
    // If the caller does not include a wildcard, we append '%' to match any suffix.
    const pattern = directory.includes('%') || directory.includes('_') ? directory : `${directory}%`;
    const selectSql = `SELECT size, directory, extension, filename, birthtime, hash, path FROM entries WHERE directory LIKE ?`;
    return this.db.prepare(selectSql).all(pattern) as FileEntry[];
  }

  deleteFileEntryById(id: number) {
    const deleteSql = `DELETE FROM entries WHERE id = ?`;
    this.db.prepare(deleteSql).run(id);
  }

  deleteFileEntryByPath(path: string) {
    const deleteSql = `DELETE FROM entries WHERE path = ?`;
    this.db.prepare(deleteSql).run(path);
  }
}
