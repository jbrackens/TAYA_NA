/* @flow */
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

export type GoogleApiConfig = {
  cache?: boolean,
  type: string,
  project_id: string,
  private_key_id: string,
  private_key: string,
  client_email: string,
  client_id: string,
  auth_uri: string,
  token_uri: string,
  auth_provider_x509_cert_url: string,
  client_x509_cert_url: string,
};

const mapResult = (rows: { [key: string]: string | boolean }[]) =>
  rows.map((row) => {
    const r: any = {};
    Object.entries(row).forEach(([key, value]) => {
      if (key != null) {
        let vv;
        if (value === true) vv = 'TRUE';
        else if (value === false) vv = 'FALSE';
        else if (value != null) vv = `${value}`;
        else vv = '';
        r[key.toLowerCase().replace(/\s/g, '')] = vv;
      }
    });
    return r;
  });

const openSheet = async (sheet: string, name: string, googleApiConfig: GoogleApiConfig) => {
  try {
    const jwt = new JWT({
      email: googleApiConfig.client_email,
      key: googleApiConfig.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const document = new GoogleSpreadsheet(sheet, jwt);
    await document.loadInfo();
    const worksheet = document.sheetsByIndex.find((w) => w.title === name);
    await worksheet.loadCells();
    const rows = await worksheet.getRows();
    return mapResult(rows.map((row) => row.toObject()));
  } catch (e) {
    throw new Error(`Unable to open sheet ${sheet} tab ${name}: ${e.toString()}`);
  }
};

const openSheets = (
  sheet: string,
  names: string[],
  googleApiConfig: GoogleApiConfig,
): Promise<$TupleMap<Array<Promise<any>>, <T>(p: Promise<T> | T) => T>> =>
  Promise.all(names.map((name) => openSheet(sheet, name, googleApiConfig)));

module.exports = { openSheets };
