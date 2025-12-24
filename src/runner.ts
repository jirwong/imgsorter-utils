import { DbService } from './services/db-service';
import { fileService } from './services/file-service';
import type { RunConfiguration } from './types/configuration';
import { loadRunConfiguration } from './utilities/load-config';

export class Runner {
  private db: DbService;
  private config: RunConfiguration;

  constructor(config: RunConfiguration) {
    this.config = config;
    this.db = new DbService(config.dbName);
  }

  async run(): Promise<void> {
    console.log('Starting run...');

    if (this.config.process_directories) {
      await this.processDirectories();
    }

    if (this.config.resync_directories) {
      await this.resyncDirectories(this.config.resync_check_actual_file);
    }

    if (this.config.update_records) {
      this.updateRecords();
    }

    console.log('Run completed.');
  }

  private async processDirectories(): Promise<void> {
    const { directories, extensions } = this.config;

    console.log('Processing directories:', directories);

    for (const directory of directories) {

      if (this.config.ignore_directories && this.config.ignore_directories.includes(directory)) {
        console.log(`Ignoring directory: ${directory}`);
        continue;
      }

      const files = await fileService.listFilesRecursive(directory, extensions);

      for (const file of files) {
        this.db.insertFileInfo(file);
      }
    }

    console.log('Processed all directories.');
  }

  private async resyncDirectories(checkActualFile: boolean = false): Promise<void> {
    const { directories, extensions } = this.config;

    console.log('Resyncing directories:', directories);

    for (const directory of directories) {

      if (this.config.ignore_directories && this.config.ignore_directories.includes(directory)) {
        console.log(`Ignoring directory: ${directory}`);
        continue;
      }

      const entries = this.db.getFileEntriesByDirectory(directory);

      if (checkActualFile) {
        console.log('Checking actual file existence for entries...');
        for (const entry of entries) {
          console.log(`Checking file existence: ${entry.path}`);
          const exists = await fileService.fileExists(entry.path);
          if (!exists) {
            this.db.deleteFileEntryByPath(entry.path);
            console.log(`Deleted missing file entry: ${entry.path}`);
          }
        }
      } else {
        console.log('Checking file entries against current directory listing...');
        const files = await fileService.listFilePathsRecursive(directory);
        for (const entry of entries) {
          console.log(`Verifying file entry: ${entry.path}`);
          const found = files.find((file) => file === entry.path);
          if (!found) {
            this.db.deleteFileEntryByPath(entry.path);
            console.log(`Deleted missing file entry: ${entry.path}`);
          }
        }
      }
    }
  }

  private updateRecords() {
    console.log('Updating database record...');
    this.db.updateFileRecords();
  }
}

(async () => {
  const config = await loadRunConfiguration('config.yaml');

  const runner = new Runner(config);
  await runner.run();
})();
