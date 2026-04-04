import { babel } from '@rollup/plugin-babel';
import replace from '@rollup/plugin-replace';
import eslint from '@rollup/plugin-eslint';
import scss from 'rollup-plugin-scss'

export default [
  {
    input:'src/js/sn.js',
    output:{
      file:'build/sn.min.js',
      format:'es'
    },
    plugins:[
      replace({
        __brand__: JSON.stringify('SportNation'),
        __site__: JSON.stringify('SportNation.bet'),
        __email__: JSON.stringify('info@sportnation.bet'),
        __url__: JSON.stringify('https://www.sportnation.bet/'),
        __cashier__: JSON.stringify('eps-money-transfer/'),
        __buildDate__: () => JSON.stringify(new Date()),
        __buildVersion: 1,
      }),
      eslint({
        exclude: ['src/styles/**']
      }),
      scss({
        output: 'build/sn.min.css',
        outputStyle: "compressed",
      }),
      babel({
        babelHelpers: 'bundled',
        exclude:'node_modules/**',
        sourcemap:'inline'
      })
    ]
  },
  {
    input:'src/js/rz.js',
    output:{
      file:'build/rz.min.js',
      format:'es'
    },
    plugins:[
      replace({
        __brand__: JSON.stringify('RedZone'),
        __site__: JSON.stringify('RedZoneSports.bet'),
        __email__: JSON.stringify('info@redzonesports.bet'),
        __buildDate__: () => JSON.stringify(new Date()),
        __buildVersion: 1,
      }),
      eslint({
        exclude: ['src/styles/**']
      }),
      scss({
        output: 'build/rz.min.css',
        outputStyle: "compressed",
      }),
      babel({
        babelHelpers: 'bundled',
        exclude:'node_modules/**',
        sourcemap:'inline'
      })
    ]
  },
  {
    input:'src/js/fb.js',
    output:{
      file:'build/fb.min.js',
      format:'es'
    },
    plugins:[
      replace({
        __brand__: JSON.stringify('FansBet'),
        __site__: JSON.stringify('fansbet.com'),
        __email__: JSON.stringify('info@fansbet.com'),
        __buildDate__: () => JSON.stringify(new Date()),
        __buildVersion: 1,
      }),
      eslint({
        exclude: ['src/styles/**']
      }),
      scss({
        output: 'build/fb.min.css',
        outputStyle: "compressed",
      }),
      babel({
        babelHelpers: 'bundled',
        exclude:'node_modules/**',
        sourcemap:'inline'
      })
    ]
  }
];
