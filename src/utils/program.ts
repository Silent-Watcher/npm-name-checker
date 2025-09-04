import { Command } from 'commander';
import { description, version } from '../../package.json';
import { checkNameAvailability } from './availability';
import { clearCache, listCache } from './cache';

export function initialProgram(): Command {
	const program = new Command();

	program
		.name('name-check')
		.description(description)
		.version(version)
		.showHelpAfterError()
		.argument('<name>', 'package name', (name) => name.toLowerCase().trim())
		.option(
			'-o --owner <owner>',
			'GitHub owner or organization name (required for checking repository name)',
			(owner) => owner.toLowerCase().trim(),
		)
		.option(
			'-t --ttl <minutes>',
			'Cache time-to-live in minutes (default: 60)',
			(val) => parseInt(val, 10),
			60,
		)
		.action((name, options) => {
			checkNameAvailability(name, options.owner);
		});

	const cacheCommand = program.command('cache').description('Manage cache');

	cacheCommand
		.command('list')
		.description('List cached entries')
		.action(() => {
			const entries = listCache();
			if (Object.keys(entries).length === 0) {
				console.log('Cache is empty.');
			} else {
				console.log('Cached entries:');

				for (const [key, entry] of Object.entries(entries)) {
					const ageMinutes = Math.floor(
						(Date.now() - entry.timestamp) / 60000,
					);
					console.log(`- ${key}: cached ${ageMinutes} min ago`);
				}
			}
		});
	cacheCommand
		.command('clear')
		.description('Clear the cache')
		.action(() => {
			clearCache();
			console.log('Cache cleared.');
		});

	program.parse(process.argv);

	return program;
}
