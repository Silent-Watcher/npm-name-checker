import chalk from 'chalk';
import ora from 'ora';
import type { AvaiabilityResult } from './types';

async function checkNpmAvailability(name: string): Promise<AvaiabilityResult> {
	const url = `https://registry.npmjs.org/${name}`;
	try {
		const response = await fetch(url, {
			method: 'GET',
		});
		const resObj = (await response.json()) as any;

		if (response.status === 404 || resObj?.error) {
			return { available: true, platform: 'npm', message: resObj.error };
		}

		return { available: false, platform: 'npm', url };
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
): Promise<AvaiabilityResult> {
	if (!owner) {
		return {
			platform: 'github',
			available: null,
			error: 'Specify owner with -o to check GitHub repo',
		};
	}
	const url = `https://api.github.com/repos/${owner}/${name}`;
	try {
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'npm-name-checker2',
			},
		});
		const resObj = (await response.json()) as any;
		if (resObj.status === '404' && resObj.message === 'Not Found') {
			return {
				available: true,
				platform: 'github',
				message: resObj.message,
			};
		}
		return { available: false, platform: 'github', url };
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
			const { platform, available, error, url, message } = result.value;

			// Create platform name with consistent spacing
			const platformLabel = `${platform}:`.padEnd(maxPlatformLength + 2);

			if (error) {
				console.log(`${chalk.red(platformLabel)} ${error}`);
			} else {
				const status = available
					? chalk.green('Available')
					: chalk.red('Taken');

				console.log(`${chalk.bold(platformLabel)} ${status}`);
			}
		} else {
			console.log(`${chalk.red('Error:')} ${result.reason.message}`);
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
			chalk.green(`✅ Available on: ${availablePlatforms.join(', ')}`),
		);
	}
}

export async function checkNameAvailability(
	name: string,
	owner: string,
): Promise<void> {
	const spinner = ora(
		`🔍 Checking availability for ${chalk.cyan(`${name}`)} ...`,
	).start();
	try {
		const results = await Promise.allSettled([
			checkNpmAvailability(name),
			checkGitHubAvailability(name, owner),
		]);

		spinner.stop();
		spinner.clear();
		displayResults(name, results);
	} catch (error) {
		console.error(
			chalk.red(
				'Error checking name availability:',
				(error as Error).message,
			),
		);
	}
}
