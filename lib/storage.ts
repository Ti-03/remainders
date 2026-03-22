import { promises as fs } from 'fs';
import path from 'path';
import { APP_USERNAME } from './constants';

const DATA_DIR = process.env.DATA_DIR || './data';
const CONFIG_FILE = 'config.json';

let dirEnsured = false;

async function ensureDir() {
  if (!dirEnsured) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    dirEnsured = true;
  }
}

function getConfigPath() {
  return path.join(DATA_DIR, CONFIG_FILE);
}

export async function readConfig(): Promise<any | null> {
  try {
    const data = await fs.readFile(getConfigPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function writeConfig(config: any): Promise<void> {
  await ensureDir();
  const existing = await readConfig();
  const merged = { ...existing, ...config, updatedAt: new Date().toISOString() };
  await fs.writeFile(getConfigPath(), JSON.stringify(merged, null, 2), 'utf-8');
}

export async function readConfigByUsername(username: string): Promise<{ data: any | null; error: string | null }> {
  if (username.toLowerCase() !== APP_USERNAME) {
    return { data: null, error: 'Config not found' };
  }
  const config = await readConfig();
  if (!config) {
    return { data: null, error: 'Config not found' };
  }
  return { data: config, error: null };
}
