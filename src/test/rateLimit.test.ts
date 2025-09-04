// src/utils/rateLimit.test.ts
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { fetchWithRateLimit } from '../utils/rateLimit';

describe('fetchWithRateLimit', () => {
	let mockFetch: Mock<(...args: any[]) => any>;

	beforeEach(() => {
		mockFetch = vi.fn();
		global.fetch = mockFetch;
		vi.useFakeTimers();
	});

	it('retries on 429 and eventually succeeds', async () => {
		mockFetch
			.mockResolvedValueOnce(
				new Response('Too Many Requests', { status: 429 }),
			)
			.mockResolvedValueOnce(new Response('OK', { status: 200 }));

		const promise = fetchWithRateLimit(
			'https://registry.npmjs.org/test',
			{},
			2,
		);

		// fast-forward timers so retries happen
		await vi.runAllTimersAsync();

		const res = await promise;

		expect(res.status).toBe(200);
		expect(mockFetch).toHaveBeenCalledTimes(2); // 1 fail + 1 success
	});

	it('retries on GitHub 403 with X-RateLimit-Remaining=0 and eventually succeeds', async () => {
		mockFetch
			.mockResolvedValueOnce(
				new Response('Forbidden', {
					status: 403,
					headers: { 'X-RateLimit-Remaining': '0' },
				}),
			)
			.mockResolvedValueOnce(new Response('OK', { status: 200 }));

		const promise = fetchWithRateLimit(
			'https://api.github.com/repos/test',
			{},
			2,
		);

		await vi.runAllTimersAsync();
		const res = await promise;

		expect(res.status).toBe(200);
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('fails after max retries on 429', async () => {
		const mockFetch = vi
			.fn()
			.mockResolvedValue(
				new Response('Too Many Requests', { status: 429 }),
			);
		global.fetch = mockFetch;

		// Wrap the call and catch internally to avoid unhandled rejection warning
		const promise = fetchWithRateLimit(
			'https://registry.npmjs.org/test',
			{},
			2,
		).catch((err) => err); // catch so the promise doesn't throw outside test

		await vi.runAllTimersAsync();

		await expect(promise).resolves.toHaveProperty(
			'message',
			'Rate limit exceeded after 2 attempts',
		);

		expect(mockFetch).toHaveBeenCalledTimes(2);
	});
});
