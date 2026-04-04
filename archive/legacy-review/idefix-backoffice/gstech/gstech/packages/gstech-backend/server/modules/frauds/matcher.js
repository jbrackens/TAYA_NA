/* @flow */
const clean = require('../players/clean');

const matchName = (suggestedName: string, validatedName: string): boolean => {
  const atoms1 = suggestedName.split(/[\s-]/).map(clean).map(x => x.toLowerCase());
  const atoms2 = validatedName.split(/[\s-]/).map(clean).map(x => x.toLowerCase());
  const matches1 = atoms1.filter(atom => atom.length === 1 ? atoms2.some(i => atom === i[0]) : atoms2.some(i => i.indexOf(atom) !== -1));
  const matches2 = atoms2.filter(atom => atom.length === 1 ? atoms1.some(i => atom === i[0]) : atoms1.some(i => i.indexOf(atom) !== -1));
  return matches1.length > 1 || matches2.length > 1;
};

module.exports = { matchName };
