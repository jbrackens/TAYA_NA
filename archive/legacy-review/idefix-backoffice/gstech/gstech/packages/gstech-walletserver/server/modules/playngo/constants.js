/* @flow */
const languageIdMap: { [string]: string } = {};

'bg_BG,ca_ES,cs_CZ,da_DK,de_DE,el_GR,en_GB,es_ES,et_EE,fi_FI,fr_FR,hr_HR,hu_HU,is_IS,it_IT,ja_JP,lt_LT,lv_LV,nl_NL,no_NO,pl_PL,pt_PT,ro_RO,ru_RU,sk_SK,sl_SI,sv_SE,tr_TR,zh_CN'.split(',').forEach((lcode) => {
  const [lang] = lcode.split('_');
  languageIdMap[lang] = lcode;
});

const MANUFACTURER_ID = 'PNG';

const mapLanguageId = (languageId: string): string => languageIdMap[languageId] || 'en_GB';

const localizedStatusCodes = {
  en_GB: { // $FlowFixMe
    0: 'OK', // $FlowFixMe
    1: 'User not found', // $FlowFixMe
    3: 'Invalid currency', // $FlowFixMe
    4: 'Wrong username', // $FlowFixMe
    5: 'Account locked', // $FlowFixMe
    6: 'Account disabled', // $FlowFixMe
    7: 'Insufficient balance', // $FlowFixMe
    8: 'Server overload', // $FlowFixMe
    9: 'Limit exceeded', // $FlowFixMe
    10: 'Session expired', // $FlowFixMe
    11: 'Limit exceeded', // $FlowFixMe
    12: 'Service not available', // $FlowFixMe
    13: 'Login failed', // $FlowFixMe
  },
  fi_FI: { // $FlowFixMe
    0: 'OK', // $FlowFixMe
    1: 'Käyttäjää ei löytynyt', // $FlowFixMe
    3: 'Väärä valuutta', // $FlowFixMe
    4: 'Väärä käyttäjänimi', // $FlowFixMe
    5: 'Tili on lukittu', // $FlowFixMe
    6: 'Tili ei ole aktiivinen', // $FlowFixMe
    7: 'Tilillä ei ole saldoa', // $FlowFixMe
    8: 'Palvelinongelma', // $FlowFixMe
    9: 'Rajoitus ylitetty', // $FlowFixMe
    10: 'Sessio ei ole aktiivinen', // $FlowFixMe
    11: 'Rajoitus ylitetty', // $FlowFixMe
    12: 'Palvelu ei ole saatavilla', // $FlowFixMe
    13: 'Sisäänkirjautuminen epäonnistui', // $FlowFixMe
  },
  sv_SE: { // $FlowFixMe
    0: 'OK', // $FlowFixMe
    1: 'Användare hittades inte', // $FlowFixMe
    3: 'Ogiltig valuta', // $FlowFixMe
    4: 'Fel användarnamn', // $FlowFixMe
    5: 'Konto låst', // $FlowFixMe
    6: 'Kontot inaktiverat', // $FlowFixMe
    7: 'Slut på krediter', // $FlowFixMe
    8: 'Servern överbelastad', // $FlowFixMe
    9: 'Gräns överskriden', // $FlowFixMe
    10: 'Sessionen utgången', // $FlowFixMe
    11: 'Gräns överskriden', // $FlowFixMe
    12: 'Tjänst inte tillgänglig', // $FlowFixMe
    13: 'Inloggning misslyckades', // $FlowFixMe
  },
  no_NO: { // $FlowFixMe
    0: 'OK', // $FlowFixMe
    1: 'Bruker ikke funnet', // $FlowFixMe
    3: 'Ugyldig valuta', // $FlowFixMe
    4: 'Feil brukernavn', // $FlowFixMe
    5: 'Låst konto', // $FlowFixMe
    6: 'Deaktivert konto', // $FlowFixMe
    7: 'Slutt på kreditt', // $FlowFixMe
    8: 'Overbelastet server', // $FlowFixMe
    9: 'Grensen er overskredet', // $FlowFixMe
    10: 'Utløpt økt', // $FlowFixMe
    11: 'Grensen er overskredet', // $FlowFixMe
    12: 'Tjenesten er ikke tilgjengelig', // $FlowFixMe
    13: 'Innlogging mislyktes', // $FlowFixMe
  },
  de_DE: { // $FlowFixMe
    0: 'OK', // $FlowFixMe
    1: 'Benutzer nicht gefunden', // $FlowFixMe
    3: 'Nicht gültige Währung', // $FlowFixMe
    4: 'Falscher Benutzername', // $FlowFixMe
    5: 'Konto geschlossen', // $FlowFixMe
    6: 'Konto Unbenutzbar', // $FlowFixMe
    7: 'Kein Saldo', // $FlowFixMe
    8: 'Server überladen', // $FlowFixMe
    9: 'Limit überzogen', // $FlowFixMe
    10: 'Sitzung abgelaufen', // $FlowFixMe
    11: 'Limit überzogen', // $FlowFixMe
    12: 'Service nicht Verfügbar', // $FlowFixMe
    13: 'Login fehlgeschlagen', // $FlowFixMe
  },
};
const statusCodes = {
  STATUS_OK: { code: '0', message: 'OK', png: true },
  STATUS_NOUSER: { code: '1', message: 'User not found', png: true },
  STATUS_INTERNAL: { code: '2', message: 'Internal error', png: true },
  STATUS_INVALIDCURRENCY: { code: '3', message: 'Invalid currency', png: true },
  STATUS_WRONGUSERNAMEPASSWORD: { code: '4', message: 'Wrong username', png: true },
  STATUS_ACCOUNTLOCKED: { code: '5', message: 'Account locked', png: true },
  STATUS_ACCOUNTDISABLED: { code: '6', message: 'Account disabled', png: true },
  STATUS_NOTENOUGHMONEY: { code: '7', message: 'Insufficient funds', png: true },
  STATUS_MAXCONCURRENTCALLS: { code: '8', message: 'Server overload', png: true },
  STATUS_SPENDINGBUDGETEXCEEDED: { code: '9', message: 'Limit exceeded', png: true },
  STATUS_SESSIONEXPIRED: { code: '10', message: 'Session expired', png: true },
  STATUS_TIMEBUDGETEXCEEDED: { code: '11', message: 'Limit exceeded', png: true },
  STATUS_SERVICEUNAVAILABLE: { code: '12', message: 'Service not available', png: true },
  STATUS_INVALIDACCESSTOKEN: { code: '13', message: 'Invalid access token', png: true },
};
export type PlaynGoStatus = $Keys<typeof statusCodes>;

const sessionStates = {
  STATE_OPEN: '0',
  STATE_CLOSED: '1',
};
export type PlaynGoSessionState = $Keys<typeof sessionStates>;

const transactionTypes = {
  TYPE_REAL: '0',
  TYPE_PROMOTIONAL: '1',
};
export type PlaynGoTransactionType = $Keys<typeof transactionTypes>;

module.exports = {
  mapLanguageId,
  MANUFACTURER_ID,
  statusCodes,
  localizedStatusCodes,
  sessionStates,
  transactionTypes,
};
