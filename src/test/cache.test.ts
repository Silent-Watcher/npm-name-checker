import fs from 'fs';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CacheEntry } from '../utils/cache';
import { clearCache, getCache, listCache, setCache } from '../utils/cache';

const CACHE_FILE = path.join(os.homedir(), '.npm-name-checker', 'cache.json');

interface NpmCacheEntry {
	available: boolean;
	platform: string;
}

describe('Cache system', () => {
	beforeEach(() => {
		clearCache();
	});

	it('stores and retrieves a cached entry', () => {
		setCache('test-key', { available: true, platform: 'npm' });
		const entry = getCache<{ available: boolean; platform: string }>(
			'test-key',
			60 * 60 * 1000,
		);
		expect(entry).not.toBeNull();
		expect(entry?.available).toBe(true);
		expect(entry?.platform).toBe('npm');
	});

	it('returns null when cache expired', () => {
		setCache('expired-key', { available: true, platform: 'npm' });

		// Read raw cache file
		const rawCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
		// Fake an old timestamp: 2 hours ago
		rawCache['expired-key'].timestamp = Date.now() - 2 * 3600 * 1000;
		// Write it back to disk
		fs.writeFileSync(CACHE_FILE, JSON.stringify(rawCache, null, 2));

		// TTL = 1 hour
		const entry = getCache<{ available: boolean; platform: string }>(
			'expired-key',
			60 * 60 * 1000,
		);
		expect(entry).toBeNull();
	});

	it('clears cache properly', () => {
		setCache('some-key', { available: true, platform: 'npm' });
		clearCache();
		const cache = listCache();
		expect(cache).toEqual({});
	});

	it('lists cached entries', () => {
		setCache<NpmCacheEntry>('list-key', {
			available: true,
			platform: 'npm',
		});
		const entries: Record<string, CacheEntry<NpmCacheEntry>> = listCache();

		expect(entries).toHaveProperty('list-key');

		const entry = entries['list-key'];
		expect(entry).toBeDefined(); // runtime check
		if (entry) {
			expect(entry.data.platform).toBe('npm');
			expect(entry.data.available).toBe(true);
		}
	});
});
