import { Command } from 'commander';
import { description, version } from '../../package.json';
import { checkNameAvailability } from './availability';

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
		.action((name, options) => {
			checkNameAvailability(name, options.owner);
		});

	program.parse(process.argv);

	return program;
}
