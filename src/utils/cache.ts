import fs from 'fs';
import os from 'os';
import path from 'path';

export interface CacheEntry<T = any> {
	timestamp: number;
	data: T;
}

const CACHE_DIR = path.join(os.homedir(), '.npm-name-checker');
const CACHE_FILE = path.join(CACHE_DIR, 'cache.json');

// ensure cache dir exists
function ensureCacheDir() {
	if (!fs.existsSync(CACHE_DIR)) {
		fs.mkdirSync(CACHE_DIR, { recursive: true });
	}
}

// read whole cache
function readCache(): Record<string, CacheEntry> {
	ensureCacheDir();
	if (!fs.existsSync(CACHE_FILE)) return {};
	try {
		return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
	} catch {
		return {};
	}
}

// write whole cache
function writeCache(cache: Record<string, CacheEntry>) {
	ensureCacheDir();
	fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// get from cache
export function getCache<T>(key: string, ttlMs: number): T | null {
	const cache = readCache();
	const entry = cache[key];
	if (!entry) return null;

	const age = Date.now() - entry.timestamp;
	if (age > ttlMs) return null; // expired

	return entry.data as T;
}

// set in cache
export function setCache<T>(key: string, data: T) {
	const cache = readCache();
	cache[key] = { timestamp: Date.now(), data };
	writeCache(cache);
}

// list cache
export function listCache(): Record<string, CacheEntry> {
	return readCache();
}

// clear cache
export function clearCache() {
	if (fs.existsSync(CACHE_FILE)) {
		fs.unlinkSync(CACHE_FILE);
	}
}
