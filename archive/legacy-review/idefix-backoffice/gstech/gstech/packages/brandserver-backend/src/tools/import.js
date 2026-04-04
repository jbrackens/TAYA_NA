/* @flow */
/* eslint-disable no-console */
process.env.LD_ENV = 'import';
const fs = require('fs').promises;
const configuration = require('../server/common/configuration');

const exportData = async (file: string, data: any) => {
  const path = `src/server/${configuration.project()}/data/${file}.json`;
  console.log('Write file', path);
  await fs.writeFile(path, JSON.stringify(data, null, 2));
};

Promise.all([require('../server/common/datasources/import-localizations')(exportData)]).then(
  (x) => {
    console.log(
      x
        .filter((z) => {
          if (Array.isArray(z)) return z.length > 0 && !z.every((y) => y === false);
          return z !== false;
        })
        .join('\n'),
    );
    return process.exit(0);
  },
);
