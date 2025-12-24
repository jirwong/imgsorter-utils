import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import YAML from 'yaml';
import type { RunConfiguration } from '../types/configuration';

export async function loadRunConfiguration(fileName: string): Promise<RunConfiguration> {
  const absPath = resolve(process.cwd(), fileName);
  const text = await readFile(absPath, 'utf8');
  const raw = YAML.parse(text) as unknown;

  if (typeof raw !== 'object' || raw === null) {
    throw new Error('config.yaml: root must be an object');
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.dbName !== 'string') {
    throw new Error('config.yaml: dbName must be a string');
  }

  if (!Array.isArray(obj.directories) || !obj.directories.every((d) => typeof d === 'string')) {
    throw new Error('config.yaml: directories must be an array of strings');
  }

  let extensions: string[] = [];
  if (Array.isArray(obj.extensions)) {
    if (!obj.extensions.every((e) => typeof e === 'string')) {
      throw new Error('config.yaml: extensions must be an array of strings');
    }
    extensions = (obj.extensions as string[])
      .map((ext) => ext.trim())
      .filter(Boolean)
      .map((ext) => (ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`));
  } else if (typeof obj.extensions === 'string') {
    extensions = (obj.extensions as string)
      .split(',')
      .map((ext) => ext.trim())
      .filter(Boolean)
      .map((ext) => (ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`));
  } else {
    throw new Error('config.yaml: extensions must be a string or an array of strings');
  }

  const updateRecords =
    typeof obj.updateRecords === 'boolean'
      ? obj.updateRecords
      : obj.updateRecords === undefined
        ? undefined
        : (() => {
            throw new Error('config.yaml: updateRecords must be a boolean if specified');
          })();

  const processDirectories =
    typeof obj.processDirectories === 'boolean'
      ? obj.processDirectories
      : obj.processDirectories === undefined
        ? undefined
        : (() => {
            throw new Error('config.yaml: processDirectories must be a boolean if specified');
          })();

  return {
    dbName: obj.dbName,
    directories: obj.directories as string[],
    extensions,
    updateRecords,
    processDirectories,
  };
}
