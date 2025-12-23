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
    await this.processDirectories(this.config.directories, this.config.extensions);
    this.db.updateFileRecords();
  }

  private async processDirectories(directories: string[], extensions?: string[]): Promise<void> {
    for (const directory of directories) {
      const files = await fileService.listFilesRecursive(directory, extensions);

      for (const file of files) {
        this.db.insertFileInfo(file);
      }
    }
  }
}

(async () => {
  const config = await loadRunConfiguration('config.yaml');

  const runner = new Runner(config);
  await runner.run();
})();
