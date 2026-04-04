/* @flow */
const messages = {
  en: {
    locked: 'Account locked',
    disabled: 'Account disabled',
    limit: 'Limit exceeded',
  },
  fi: {
    locked: 'Tili on lukittu',
    disabled: 'Tili ei ole aktiivinen',
    limit: 'Rajoitus ylitetty',
  },
  sv: {
    locked: 'Konto låst',
    disabled: 'Kontot inaktiverat',
    limit: 'Gräns överskriden',
  },
  no: {
    locked: 'Låst konto',
    disabled: 'Deaktivert konto',
    limit: 'Grensen er overskredet',
  },
  de: {
    locked: 'Konto geschlossen',
    disabled: 'Konto Unbenutzbar',
    limit: 'Limit überzogen',
  },
};

const get = (lang: string, key: $Keys<typeof messages.en>): any => {
  // $FlowFixMe[invalid-computed-prop]
  const r = messages[lang] || messages.en;
  return r[key];
};

module.exports = { get };
