/* @noflow */
require(`${process.env.NODE}/../../lib/node_modules/@babel/register`)({
  rootMode: 'upward',
  only: [/gstech-core/],
});
require('./web')

if (!process.env.NO_REGISTER && process.env.DBG_BRAND && !process.env.DBG_REGISTERED) {
  require('./register-dbg');
  process.env.DBG_REGISTERED = 'true';
}
