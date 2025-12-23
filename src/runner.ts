import { DbService } from './services/db-service';
import { fileService } from './services/file-service';

const DB_NAME = 'local.db';
const extensions = 'jpg,png,gif,jpeg'.split(',').map((ext) => `.${ext.toLowerCase()}`);
const directories = ['/Users/jir.wong/development/personal/image-sorter/imgsorter-utils/test-images'];

export class Runner {
  private db: DbService;

  constructor() {
    this.db = new DbService(DB_NAME);
  }

  async run() {
    // const dbService = new DbService(DB_NAME);
    const files = await this.processDirectory(directories, extensions);
    // console.log(files);
  }

  async processDirectory(directories: string[], extensions?: string[]) {
    for (const dir of directories) {
      const files = await fileService.listFilesRecursive(dir, extensions);

      for (const file of files) {
        this.db.insertFileInfo(file);
      }
    }
  }
}

(async () => {
  const runner = new Runner();
  await runner.run();
})();
