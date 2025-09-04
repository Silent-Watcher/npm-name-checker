#!/usr/bin/env node
import { styleText } from 'node:util';
import { initialProgram } from './utils/program';

process.on('SIGINT', () => {
	console.log(styleText('yellow', '\nCtrl + c Pressed.....'));
	process.exit(0);
});

initialProgram();
