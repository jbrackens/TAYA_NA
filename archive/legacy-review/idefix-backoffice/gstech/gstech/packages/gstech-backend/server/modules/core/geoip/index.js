/* @flow */
const maxmind = require('maxmind');
const path = require('path');

let dbCache;

const openDb = async () => {
  if (dbCache != null) {
    return dbCache;
  }
  dbCache = await maxmind.open(path.join(__dirname, 'GeoLite2-Country.mmdb'));
  return dbCache;
};

const lookup = async (ip: IPAddress): Promise<?string> => {  
  const db = await openDb();
  const result = db.get(ip);
  if (result != null && result.country != null) {
    return result.country.iso_code;
  }
  return null;
};

const formatIp = async (ip: IPAddress): Promise<string> => {
  const ipCountry = await lookup(ip);
  if (ipCountry != null) {
    return `${ip} (${ipCountry})`;
  }
  return ip;
};

module.exports = { lookup, formatIp };
