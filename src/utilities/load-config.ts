import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import YAML from 'yaml';
import type { RunConfiguration } from '../types/configuration';
import { Validator } from 'yaml-validator';

const runConfigSchema = {
  type: 'object',
  required: ['dbName', 'directories', 'extensions'],
  properties: {
    dbName: { type: 'string' },
    directories: {
      type: 'array',
      items: { type: 'string' },
    },
    extensions: {
      anyOf: [
        { type: 'string' },
        { type: 'array', items: { type: 'string' } },
      ],
    },
  },
};

const validator = new Validator(runConfigSchema);

export async function loadRunConfiguration(fileName: string): Promise<RunConfiguration> {
  const absPath = resolve(process.cwd(), fileName);
  const text = await readFile(absPath, 'utf8');
  const raw = YAML.parse(text) as unknown;

  const result = validator.validate(raw);
  if (!result.valid) {
    const message = result.errors?.map((e: string) => e).join(', ') || 'validation failed';
    throw new Error(`config.yaml: ${message}`);
  }

  const obj = raw as Record<string, unknown>;

  let extensions: string[] = [];
  if (Array.isArray(obj.extensions)) {
    extensions = obj.extensions as string[];
  } else if (typeof obj.extensions === 'string') {
    extensions = (obj.extensions as string)
      .split(',')
      .map((ext) => ext.trim())
      .filter(Boolean)
      .map((ext) => (ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`));
  }

  return {
    dbName: obj.dbName as string,
    directories: obj.directories as string[],
    extensions,
  };
}
