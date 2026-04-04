/* eslint-disable no-plusplus */
// @flow
const fs = require('fs').promises;
const path = require('path');
const _ = require('lodash');

const logger = require('./logger');

async function* getFiles(dir: string = `./`): any {
  const entries: any = await fs.readdir(dir, { withFileTypes: true })

  for (const file of entries) {
    if (file.isDirectory()) {
      yield* getFiles(`${dir}/${file.name}`)
    } else {
      yield { ...file, path: `${dir}/${file.name}` }
    }
  }
}

const flowKeys = ['// @flow', '/* @flow */'];

const importTypes = async (typesDirectory: string = './types', targetDirectory: string = './server') => {
  const types: { [any]: any } = {};
  const flatTypes: string[] = [];
  for await (const file: any of getFiles(typesDirectory)) {
    const data: any = await fs.readFile(file.path, { encoding: 'utf8' });
    const pattern = /export type [a-zA-Z0-9_]+/g;
    const matches = data.match(pattern) || [];
    const typeNames = matches.map(m => m.replace('export type ', ''));
    types[file.path] = typeNames;
    flatTypes.push(...typeNames);
  }

  logger.info(`Detected ${flatTypes.length} type definitions.`);

  let counter = 0;
  for await (const file: any of getFiles(targetDirectory)) {
    const data: any = await fs.readFile(file.path, { encoding: 'utf8' });
    const usedTypes = flatTypes.filter(
      (ft) =>
        data.includes(`: ${ft},`) ||
        data.includes(`: ${ft})`) ||
        data.includes(`: ${ft}[]`) ||
        data.includes(`: ${ft} `) ||
        data.includes(`...${ft}`) ||
        data.includes(`| ${ft}`) ||
        data.includes(`<${ft}>`) ||
        data.includes(`<${ft}[]>`),
    );
    const keys = Object.entries(
      _.groupBy<string, any>(usedTypes, (ut) =>
        Object.keys(types)
          .map((t) => (types[t].includes(ut) ? t : null))
          .filter((e) => e),
      ),
    ).map(
      (e: any) =>
        `import type { ${e[1].join(', ')} } from '${path
          .relative(file.path, e[0])
          .replace(/^..\//, '')
          .replace('.js', '')}';`,
    ).filter(e => !e.includes('from \'\''));

    if (keys.length > 0) {
      logger.info(`Importing types to ${file.path} file`);

      const flowKey = flowKeys.find(fk => data.includes(fk));
      const newData = data.replace(flowKey, `${flowKeys[0]}\n${keys.join('\n')}\n`);
      await fs.writeFile(file.path, newData, 'utf8');

      counter++;
    }
  }

  logger.info(`${counter} files affected.`);
};

module.exports = importTypes;
