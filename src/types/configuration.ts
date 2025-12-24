export type RunConfiguration = {
  dbName: string;
  extensions: string[];
  directories: string[];
  update_records?: boolean;
  process_directories?: boolean;
  resync_directories?: boolean;
};
