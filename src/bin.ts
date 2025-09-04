#!/usr/bin/env node

import { initialProgram } from './utils/program';

process.on('SIGINT', () => {
	console.log(chalk.yellow('\nCtrl + c Pressed.....'));
	process.exit(0);
});

initialProgram();
