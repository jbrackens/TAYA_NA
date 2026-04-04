#!/usr/bin/env node
/* @flow */
require('flow-remove-types/register');

const { program } = require('commander');
const request = require('supertest'); // eslint-disable-line
const opn = require('opn'); // eslint-disable-line

const logger = require('gstech-core/modules/logger');

program
  .command('run [jobModule] [param]')
  .description('')
  .action(async (jobModule, param) => {
    const job = require(jobModule);
    await job(param);

    process.exit();
  });


program.on('*', o => logger.error('Invalid command:', o));

if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit();
}

program.parse(process.argv);
