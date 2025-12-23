import { DbService } from './services/db-service';
import { fileService } from './services/file-service';
import { RunConfiguration } from './types/configuration';

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
  const config: RunConfiguration = {
    dbName: 'local.db',
    extensions: 'jpg,png,gif,jpeg'.split(',').map((ext) => `.${ext.toLowerCase()}`),
    directories: ['/Users/jir.wong/development/personal/image-sorter/imgsorter-utils/test-images'],
  };

  const runner = new Runner(config);
  await runner.run();
})();
