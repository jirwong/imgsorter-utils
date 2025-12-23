import { DbService } from './db-service';
import { fileService } from './file-service';

(async () => {
  const TEST_DB_PATH = 'local.db';
  const dbService = new DbService(TEST_DB_PATH);


})();
