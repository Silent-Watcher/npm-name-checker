#!/usr/bin/env node
import chalk from 'chalk';
import { initialProgram } from './utils/program';

function main() {
	const program = initialProgram();
}

process.on('SIGINT', () => {
	console.log(chalk.yellow('\nCtrl + c Pressed.....'));
	process.exit(0);
});

main();
