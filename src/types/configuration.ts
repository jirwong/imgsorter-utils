export type RunConfiguration = {
  dbName: string;
  extensions: string[];
  directories: string[];
  updateRecords?: boolean;
  processDirectories?: boolean;
};
