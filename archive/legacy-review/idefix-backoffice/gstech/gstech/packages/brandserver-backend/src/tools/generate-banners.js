/* @flow */
const { glob } = require('glob');  
const stylus = require('stylus');
const nib = require('nib').path;
const autoprefixer = require('autoprefixer-stylus');
const async = require('async');
const fs = require('fs');

const configuration = require('../server/common/configuration');

const basePath = `src/stylus/${configuration.project()}/inline_banners/`;

const process = (filename: string, callback: (err: any, data: any) => any | void) =>
  fs.readFile(filename, (err, source) => {
    if (err != null) {
      return callback(err);
    }
    // eslint-disable-next-line no-console
    console.log(filename);
    return stylus(source.toString())
      .include(nib)
      .import(`${__dirname}/../stylus/${configuration.project()}/mixins.styl`)
      .import(`${__dirname}/../stylus/${configuration.project()}/banners/_banner_sprites.styl`)
      .use(autoprefixer({ overrideBrowserslist: 'last 2 versions' }))
      .set('compress', true)
      .render((err, css) => {
        if (err != null) {
          return callback(err);
        }
        const f = filename.substring(basePath.length).split('/');
        const name = f.join('_').replace(/\.(.*)/, '');
        return callback(null, { name, css });
      });
  });

(async () => {
  const filenames = await glob(`${basePath}**/*.styl`);
  return async.map(filenames, process, (err, res) => {
    if (err != null) {
      throw err;
    }
    const output = {};
    for (const x of Array.from(res)) {
      output[x.name] = x.css;
    }
    return fs.writeFile(
      `${__dirname}/../server/${configuration.project()}/data/inline-styles.json`,
      JSON.stringify(output, null, 2),
      // eslint-disable-next-line no-console
      () => console.log('Done!'),
    );
  });
})();
