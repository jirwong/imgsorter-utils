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

    // TODO : Add configuration to toggle
    await this.processDirectories();

    // TODO : Add configuration to toggle
    this.updateRecords();

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

  private async updateRecords() {
    console.log('Updating database record...');
    this.db.updateFileRecords();
  }
}

(async () => {
  const config = await loadRunConfiguration('config.yaml');

  const runner = new Runner(config);
  await runner.run();
})();
