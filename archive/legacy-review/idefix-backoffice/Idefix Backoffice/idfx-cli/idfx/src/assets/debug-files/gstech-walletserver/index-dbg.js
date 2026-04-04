/* @noflow */
require(`${process.env.NODE}/../../lib/node_modules/@babel/register`)({
  rootMode: 'upward',
  only: [/gstech-core/],
});
require('./index')
