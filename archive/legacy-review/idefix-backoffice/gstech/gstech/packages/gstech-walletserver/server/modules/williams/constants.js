/* @flow */
const languageIdMap = {
  en: 'en_GB',
  fi: 'fi_FI',
  sv: 'sv_SE',
  no: 'no_NO',
  de: 'de_DE',
};
const MANUFACTURER_ID = 'SGI';

// $FlowFixMe[invalid-computed-prop]
const mapLanguageId = (languageId: string): string => languageIdMap[languageId] || 'en_GB';
const encryptionKey = '32njkE9hqsuXce2GmyYN{ua8]ukJ8vU7';
module.exports = { mapLanguageId, MANUFACTURER_ID, encryptionKey };
