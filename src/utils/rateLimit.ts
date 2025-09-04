import { setTimeout as delay } from 'timers/promises';

export async function fetchWithRateLimit(
	url: string,
	options: RequestInit = {},
	maxRetries = 3,
): Promise<Response> {
	let attempt = 0;

	while (attempt < maxRetries) {
		const res = await fetch(url, options);

		if (res.ok || res.status === 404) {
			return res;
		}

		// Too many requests
		if (res.status === 429) {
			attempt++;
			if (attempt >= maxRetries) {
				throw new Error(
					'Rate limit exceeded after ' + maxRetries + ' attempts',
				);
			}

			const delayTime = 2 ** attempt * 500;
			await new Promise((resolve) => setTimeout(resolve, delayTime));
			continue;
		}

		// GitHub 403 with no remaining
		if (res.status === 403) {
			const remaining = res.headers.get('X-RateLimit-Remaining');
			if (remaining === '0') {
				attempt++;
				if (attempt >= maxRetries) {
					throw new Error(
						'Rate limit exceeded after ' + maxRetries + ' attempts',
					);
				}

				const delayTime = 2 ** attempt * 500;
				await new Promise((resolve) => setTimeout(resolve, delayTime));
				continue;
			}
		}

		throw new Error(url + ' failed with status ' + res.status);
	}

	throw new Error('Rate limit exceeded after ' + maxRetries + ' attempts');
}
