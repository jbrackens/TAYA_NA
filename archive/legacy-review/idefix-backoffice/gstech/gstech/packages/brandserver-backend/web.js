/* @flow */
require('flow-remove-types/register')({ ignoreUninitializedFields: true });
require('dd-trace').init({ logInjection: true });
// process.env.UV_THREADPOOL_SIZE = 16;

if(process.env.LD_ENV === 'worker') {
  require('./src/worker/app');
} else {
  require('./src/server/common/app');
}
