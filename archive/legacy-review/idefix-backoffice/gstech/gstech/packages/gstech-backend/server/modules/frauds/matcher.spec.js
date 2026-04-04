/* @flow */
const { matchName } = require('./matcher');

describe('Matcher', () => {
  it('accepts similar strings', () => {
    [
      ['Edvard Mörkö', 'EDVARD MÖRKÖ'],
      ['Edvard Mörkö', 'EDVARD MORKO'],
      ['Edvard Mörkö', 'EDVARD KEIMO MORKO'],
      ['Edvard Keimo Mörkö', 'EDVARD KEIMO MORKO'],
      ['Edvard Keimo Mörkö', 'EDVARD MORKO'],
      ['anne mari koivu', 'mari anne koivu'],
      ['anne-mari koivu', 'mari anne koivu'],
      ['anne-mari koivu', 'mari koivu'],
      ['KK VON TOFFEL', 'Klaus Kristian von Toffel'],
      ['MS K TOFFEL', 'Klaus Kristian Toffel'],
    ].forEach(([a, b]) => {
      expect(matchName(a, b)).to.equal(true);
    });
  });

  it('rejects nonsimilar strings', () => {
    [
      ['Edvard Mörkö', 'Kauko keisko'],
      ['Edvard Mörkö', 'Kauko Mörkö'],
      ['MR E Mörkö', 'Kauko Mörkö'],
      ['mari heino', 'samu huhto'],
      ['D V Foobar', 'Anders Beethoven'],
    ].forEach(([a, b]) => {
      expect(matchName(a, b)).to.equal(false);
    });
  });
});
