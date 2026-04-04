/* @flow */
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const tar = require('tar-stream');
const gunzip = require('gunzip-maybe');
const maxmind = require('maxmind');
const { DateTime } = require('luxon');
const contentDisposition = require('content-disposition');
const { axios } = require('gstech-core/modules/axios');

const filePath = path.join('server', 'modules', 'core', 'geoip', 'GeoLite2-Country.mmdb');
const fileUrl = new URL('https://download.maxmind.com/app/geoip_download');
const editionId = 'GeoLite2-Country';
const suffix = 'tar.gz';
const licenseKey = 'QAI3NfcKFMvRChVL';
fileUrl.searchParams.append('edition_id', editionId);
fileUrl.searchParams.append('license_key', licenseKey);
fileUrl.searchParams.append('suffix', suffix);

const checkCurrentVersion = async (force: boolean = false): Promise<boolean> => {
  if (!fs.existsSync(filePath) || force) return true;
  try {
    const currGeo = await maxmind.open(filePath);
    const { buildEpoch } = currGeo.metadata;
    const res = await axios.head<any>(fileUrl.toString());
    if (!res.headers || !res.headers['content-disposition']) return true;
    const { parameters } = contentDisposition.parse(res.headers['content-disposition']);
    const lastUpdateStr = parameters.filename.replace(`.${suffix}`, '').split('_').pop();
    const buildEpochStr = DateTime.fromJSDate(buildEpoch).toFormat('yyyyMMdd');
    return buildEpochStr !== lastUpdateStr;
  } catch (err) {
    console.error(err);
    return false;
  }
};

(async () => {
  console.log('+++ update-geo-date', 'Checking Geo IP Data');
  const shouldDownload = await checkCurrentVersion();
  if (shouldDownload) {
    console.log('+++ update-geo-date', 'Downloading Geo IP Data');
    const extract = tar.extract();
    extract.on('entry', (header, stream, next) => {
      stream.on('end', () => {
        next();
      });

      if (header.name.includes('GeoLite2-Country.mmdb')) {
        const ws = fs.createWriteStream(filePath);
        stream.pipe(ws);
      }
      stream.resume();
    });

    try {
      await axios.get(fileUrl.toString(), { responseType: 'stream' }).then((res) => {
        res.data.pipe(gunzip()).pipe(extract);
      });
    } catch (err) {
      console.error('XXX update-geo-date', 'Error downloading Geo IP Data', err);
    }
  } else {
    console.log('+++ update-geo-date', 'Skipping Geo IP Data update');
  }
})();
