/* @flow */

const { createCSVString, parseCSVList, parseTags } = require('./utils');

describe('utils', () => {
  describe('createCSVString', () => {
    it('creates csv string', () => {
      const string = createCSVString(
        [
          { id: 'username', title: 'Username' },
          { id: 'email', title: 'Email' },
        ],
        [
          { username: 'U1', email: '1@gmail.com' },
          { username: 'U2', email: '2@gmail.com' },
        ],
      );

      expect(string).to.equal('Username,Email\r\nU1,1@gmail.com\r\nU2,2@gmail.com');
    });

    it('does not choke with bigger data', () => {
      const headerIds = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const headers = headerIds.map(n => ({ id: n, title: n }));
      const values = [...Array(10000).keys()].map((_, i) =>
        headerIds.reduce<{ [string]: number }>(
  (acc, curr) => {
    acc[curr] = i;
    return acc;
  },
  {},
));

      const startTime = new Date();
      createCSVString(headers, values);
      const endTime = new Date();
      expect(endTime.getTime() - startTime.getTime()).to.be.below(100);
    });
  });

  describe('parseCSVList', () => {
    it('returns a list', () => {
      const input = ['username1', 'username2', 'username3'];

      const list = parseCSVList(input.join('\n'));

      expect(list).to.have.members(input);
    });
  });

  describe('parseTags', () => {
    it('can replace any simple tag', () => {
      const text = 'Hello {name}, what are you {action}?';
      const values = { name: 'Jonas', action: 'eating' };

      const result = parseTags(text, values);

      expect(result).to.equal('Hello Jonas, what are you eating?');
    });

    it('can replace and format currency tags', () => {
      const text = 'Get {currency:50} for {currency:75}';
      const options = { currencyId: 'EUR', langCode: 'en' };

      const result = parseTags(text, {}, options);

      expect(result).to.equal('Get €50 for €75');
    });

    it('can replace and format link tags using linkTemplate', () => {
      const text = '{link|Click} and win!';
      const options = {
        linkTemplate: '<a href="{{link}}" class="some-class">{{value}}</a>',
      };

      const result = parseTags(text, { link: 'http://google.com' }, options);

      expect(result).to.equal('<a href="http://google.com" class="some-class">Click</a> and win!');
    });

    it('can parse everything altogether', () => {
      const text = "Hey {name}, how's {thing}? Wanna {currency:50}? {link|Click} here!";
      const values = {
        name: 'Andy',
        thing: 'riding unicorns',
        link: 'http://9gag.com',
      };
      const options = { currencyId: 'NOK', langCode: 'en' };

      const result = parseTags(text, values, options);

      expect(result).to.equal(
        'Hey Andy, how\'s riding unicorns? Wanna kr500? <a href="http://9gag.com">Click</a> here!',
      );
    });

    it('can parse values with finish characters', () => {
      const text = 'Howdy, click {link|tästä}';
      const values = { link: 'https://kalevalakasino/en/unsubscribe?email=ashdgja@gmail.com' };
      const options = { currencyId: 'NOK', langCode: 'en' };

      const result = parseTags(text, values, options);

      expect(result).to.equal(
        'Howdy, click <a href="https://kalevalakasino/en/unsubscribe?email=ashdgja@gmail.com">tästä</a>',
      );
    });
  });
});
