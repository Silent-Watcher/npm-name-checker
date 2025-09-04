import { styleText } from 'node:util';
import ora from 'ora';
import { getCache, setCache } from './cache';
import { fetchWithRateLimit } from './rateLimit';
import { generateAlternatives } from './recommender';
import type { AvaiabilityResult } from './types';

export async function checkNpmAvailability(
	name: string,
	ttlMs: number,
): Promise<AvaiabilityResult> {
	const cacheKey = `npm:${name}`;
	const cached = getCache<AvaiabilityResult>(cacheKey, ttlMs);
	if (cached) return cached;

	const url = `https://registry.npmjs.org/${name}`;
	try {
		const response = await fetchWithRateLimit(url, {
			method: 'GET',
		});
		const resObj = (await response.json()) as any;

		const result: AvaiabilityResult =
			response.status === 404 || resObj?.error
				? { available: true, platform: 'npm', message: resObj?.error }
				: { available: false, platform: 'npm', url };
		setCache(cacheKey, result);
		return result;
	} catch (error) {
		return {
			available: null,
			platform: 'npm',
			error: (error as Error).message,
		};
	}
}

async function checkGitHubAvailability(
	name: string,
	owner: string,
	ttlMs: number,
): Promise<AvaiabilityResult> {
	if (!owner) {
		return {
			platform: 'github',
			available: null,
			error: 'Specify owner with -o to check GitHub repo',
		};
	}

	const cacheKey = `github:${owner}/${name}`;
	const cached = getCache<AvaiabilityResult>(cacheKey, ttlMs);
	if (cached) return cached;

	const url = `https://api.github.com/repos/${owner}/${name}`;
	try {
		const response = await fetchWithRateLimit(url, {
			headers: {
				'User-Agent': 'npm-name-checker2',
			},
		});
		const resObj = (await response.json()) as any;

		const result: AvaiabilityResult =
			response.status === 404 ||
			(resObj.status === '404' && resObj.message === 'Not Found')
				? {
						available: true,
						platform: 'github',
						message: resObj.message,
					}
				: { available: false, platform: 'github', url };
		setCache(cacheKey, result);
		return result;
	} catch (error) {
		return {
			platform: 'github',
			available: null,
			error: (error as Error).message,
		};
	}
}

function displayResults(
	name: string,
	results: PromiseSettledResult<AvaiabilityResult>[],
) {
	// Calculate the maximum platform name length for alignment
	const maxPlatformLength = Math.max(
		...results.map((result) =>
			result.status === 'fulfilled' ? result.value.platform.length : 0,
		),
	);

	results.forEach((result) => {
		if (result.status === 'fulfilled') {
			const { platform, available, error } = result.value;

			// Create platform name with consistent spacing
			const platformLabel = `${platform}:`.padEnd(maxPlatformLength + 2);

			if (error) {
				console.log(`${styleText('red', platformLabel)} ${error}`);
			} else {
				const status = available
					? styleText('green', 'Available')
					: styleText('red', 'Taken');

				console.log(`${styleText('bold', platformLabel)} ${status}`);
			}
		} else {
			console.log(
				`${styleText('red', 'Error:')} ${result.reason.message}`,
			);
		}
	});

	const availablePlatforms = results
		.filter(
			(result) =>
				result.status === 'fulfilled' &&
				result.value.available === true,
		)
		.map(
			(result) =>
				(result as PromiseFulfilledResult<AvaiabilityResult>).value
					.platform,
		);

	if (availablePlatforms.length > 0) {
		console.log(
			styleText(
				'green',
				`✅ Available on: ${availablePlatforms.join(', ')}`,
			),
		);
	}
}

export async function checkNameAvailability(
	name: string,
	owner: string,
	ttlMinutes = 60,
): Promise<void> {
	const ttlMs = ttlMinutes * 60 * 1000;

	const spinner = ora(
		`🔍 Checking availability for ${styleText('cyan', name)} ...`,
	).start();
	try {
		const results = await Promise.allSettled([
			checkNpmAvailability(name, ttlMs),
			checkGitHubAvailability(name, owner, ttlMs),
		]);
		spinner.stop();
		spinner.clear();
		displayResults(name, results);

		// Check if any platform is taken (available === false) or has error preventing check
		const fulfilledResults = results.filter(
			(r): r is PromiseFulfilledResult<AvaiabilityResult> =>
				r.status === 'fulfilled',
		);
		const isFullyAvailable = fulfilledResults.every(
			(r) => r.value.available === true || r.value.available === null,
		);
		if (isFullyAvailable) {
			return; // No suggestions needed if everything is available or skipped
		}

		console.log(
			styleText('bold', '\nSuggestions for available alternatives:'),
		);
		const altSpinner = ora(
			'Generating and checking alternatives...',
		).start();

		const alts = generateAlternatives(name);
		const availableAlts: string[] = [];
		const delay = (ms: number) =>
			new Promise((resolve) => setTimeout(resolve, ms));

		for (let i = 0; i < alts.length; i++) {
			const alt = alts[i];
			if (!alt) continue;
			await delay(i * 200);
			const altChecks: Promise<AvaiabilityResult>[] = [
				checkNpmAvailability(alt, ttlMinutes),
			];
			if (owner) {
				altChecks.push(checkGitHubAvailability(alt, owner, ttlMinutes));
			}
			const altResults = await Promise.allSettled(altChecks);
			const altFulfilled = altResults.filter(
				(r): r is PromiseFulfilledResult<AvaiabilityResult> =>
					r.status === 'fulfilled',
			);
			const isAltFullyAvailable = altFulfilled.every(
				(r) => r.value.available === true || r.value.available === null,
			);
			if (
				isAltFullyAvailable &&
				altFulfilled.length === altChecks.length
			) {
				availableAlts.push(alt);
			}
			if (availableAlts.length >= 10) break;
		}

		altSpinner.stop();
		altSpinner.clear();

		if (availableAlts.length === 0) {
			console.log(
				'No immediate suggestions available – try broader variations.',
			);
		} else {
			const platforms = owner ? 'npm and GitHub' : 'npm';
			availableAlts.forEach((alt) => {
				console.log(
					`- ${styleText('green', alt)} (available on ${platforms})`,
				);
			});
		}
	} catch (error) {
		console.error(
			styleText(
				'red',
				'Error checking name availability: ' + (error as Error).message,
			),
		);
	}
}
