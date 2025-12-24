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

    if (this.config.update_records) {
      this.updateRecords();
    }

    if (this.config.resync_directories) {
      await this.resyncDirectories();
    }

    console.log('Run completed.');
  }

  private async processDirectories(): Promise<void> {
    const { directories, extensions } = this.config;

    console.log('Processing directories:', directories);

    for (const directory of directories) {
      const files = await fileService.listFilesRecursive(directory, extensions);

      for (const file of files) {
        this.db.insertFileInfo(file);
      }
    }

    console.log('Processed all directories.');
  }

  private async resyncDirectories(): Promise<void> {
    const { directories } = this.config;

    console.log('Resyncing directories:', directories);

    for (const directory of directories) {
      const entries = this.db.getFileEntriesByDirectory(directory);

      for (const entry of entries) {
        console.log(`Checking file existence: ${entry.path}`);
        const exists = await fileService.fileExists(entry.path);
        if (!exists) {
          this.db.deleteFileEntryByPath(entry.path);
          console.log(`Deleted missing file entry: ${entry.path}`);
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
