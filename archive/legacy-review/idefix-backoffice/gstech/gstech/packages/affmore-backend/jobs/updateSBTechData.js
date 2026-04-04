/* eslint-disable no-continue */
/* @flow */

/* For local testing :
docker run --name sftp-server \
    -v ~/temp/data:/home/sbtech/data \
    -p 2222:22 -d atmoz/sftp \
    sbtech:sbtechpass:1001

copy files to ~/temp/data folder

yarn migrate
yarn workspace affmore-backend data:fake

minio docker-compose for M1
image: quay.io/minio/minio:RELEASE.2022-05-08T23-50-31Z

NODE_ENV=local yarn workspace affmore-backend data:updateSBTech
 */

import type {
  RegistrationReportResponse,
  ActivitiesReportResponse,
} from 'gstech-core/modules/clients/backend-payment-api';

import type { SftpConfig } from '../server/modules/sftp/sftp';
import type { BannerTag } from '../types/common';

const { DateTime } = require('luxon');
const logger = require('gstech-core/modules/logger');
// eslint-disable-next-line import/no-unresolved -- https://github.com/adaltas/node-csv/issues/372
const { parse } = require('csv-parse/sync');
const pgs = require('gstech-core/modules/pg');
const money = require('gstech-core/modules/money');
const sFTP = require('../server/modules/sftp/sftp');
const affiliatesRepository = require('../server/modules/admin/affiliates/repository');
const operations = require('../server/operations');
const config = require('../server/config');

const testFtpCfg: SftpConfig = {
  host: '127.0.0.1',
  port: 2222,
  username: 'sbtech',
  password: 'sbtechpass',
  brandSuffix: 'Sportnation',
  folderReg: 'data/Downloads/',
  folderSales: 'data/Sales/',
};

const csvReg = {
  Date: 0,
  BTag: 1,
  PlayerID: 2,
  PlayerUsername: 3,
  PlayerCountry: 4,
};

const csvSales = {
  Date: 0,
  PlayerID: 1,
  BTag: 2,
  Deposit: 3,
  Chargeback: 4,
  CasinoBetsNum: 5,
  CasinoRevenue: 6,
  CasinoStake: 7,
  CasinoBonus: 8,
  CasinoPoints: 9,
  SportsbookBetsNum: 10,
  SportsbookRevenue: 11,
  SportsbookStake: 12,
  SportsbookBonus: 13,
  SportsbookPoints: 14,
};

const checkTag = (tag: BannerTag) => {
  if ( !isNaN(tag.a) && tag.b !== null ) return tag
  return null
}

const parseBannerTagExtended = (tag: string) => {
  // a_..b_..c_.. format
  if (tag.indexOf('a_')===0) {
    const n1 = tag.indexOf('a_');
    const n2 = tag.indexOf('b_');
    const n3 = tag.indexOf('c_');
    const tagInfo: BannerTag = {
      a: tag.substring(n1 + 2, n2), // Number
      b: n3 > 0 ? tag.substring(n2 + 2, n3) : tag.substring(n2 + 2), // String
      c: tag.substring(n3 + 2), // Number || null -- ignore many string values
    };

    return checkTag(tagInfo);
  }
  // native idefix format
  const crumbs = tag.split('_').map(x => x.trim());
  if (crumbs.length>=2) {
    const tagInfo: BannerTag = {
      a: crumbs[0],
      b: crumbs[1],
      c: crumbs[2],
    };

    return checkTag(tagInfo);
  }
  // undefined format
  return null
};


const findSFTPFile = async (cfg: SftpConfig, folderIn: string, brandSuffix: string, date: DateTime) =>{
  const timeSuffix = date.toFormat('yyyyMMdd');
  const files = await sFTP.List(cfg, folderIn);
  if (files.length === 0) {
    logger.debug('ftp folder is empty');
  }

  for (const file of files) {
    const fileParts = file.name.split('_');
    const dt = fileParts[2].substr(0, fileParts[2].lastIndexOf('.csv'));
    if (fileParts[0] === brandSuffix && dt === timeSuffix) {
      logger.debug(`find CSV file: ${file.name}`);
      return file;
    }
  }
  logger.debug(`csv file not found for date ${timeSuffix} in ${folderIn} for ${brandSuffix}`);
  return null
};

const downloadCSVFile = async (cfg: SftpConfig, folderIn: string, brandSuffix: string, date: DateTime, encoding?: string)  => {
  const file = await findSFTPFile(cfg,folderIn, brandSuffix, date);

  if (file !== null) {
    const csvData = await sFTP.GetFileData(cfg, `${folderIn}/${file.name}`, encoding);
    logger.debug(`download CSV file in ${folderIn}/${file.name} length= ${ Object.keys(csvData).length }`);
    return parse(csvData, { skip_empty_lines: true }).slice(1);
  }
  return null
}

const updateSBTechBrand = async (brandId: any, date: DateTime) => {
  logger.debug('updateSBTechBrand', brandId, date);
  const cfg: SftpConfig =
    process.env.NODE_ENV !== 'local' && config.sftpCfg !== undefined ? config.sftpCfg : testFtpCfg;

  // Registrations
  const csvRegistrations = await downloadCSVFile(cfg, cfg.folderReg, cfg.brandSuffix, date, 'utf16le');

  if (csvRegistrations !== null && csvRegistrations.length > 0) {
    logger.debug('updateSBTechBrand registrations', csvRegistrations.length);
    // Mapping ingest data to RegistrationReportResponse type
    const registrations: Array<RegistrationReportResponse> = [];
    for (const reg of csvRegistrations) {
      const newItem: RegistrationReportResponse = {
        playerId: reg[csvReg.PlayerID],
        countryCode: reg[csvReg.PlayerCountry],
        bannerTag: reg[csvReg.BTag],
        registrationIP: '',
        registrationDate: DateTime.fromISO(reg[csvReg.Date], { zone: 'utc' }).toJSDate(),
        username: reg[csvReg.PlayerUsername],
      };
      logger.debug('updateSBTechBrand new registration item',{newItem});
      registrations.push(newItem);
    }
    await operations.updateRegistrations(pgs, registrations, brandId, parseBannerTagExtended);
    logger.debug('updateSBTechBrand registrations done');
  }

  // Update sales data
  const csvActivities = await downloadCSVFile(cfg, cfg.folderSales, cfg.brandSuffix, date, 'utf8');

  if (csvActivities !== null && csvActivities.length > 0) {
    logger.debug('updateSBTechBrand activities', csvActivities.length);
    await pgs.transaction(async (pg) => {
      const activities: Array<ActivitiesReportResponse> = [];

      for (const csvItem of csvActivities) {
        const tagInfo = parseBannerTagExtended(csvItem[csvSales.BTag]);
        if (tagInfo === null){
          logger.debug('updateSBTechBrand: wrong format for activities btag ',csvItem[csvSales.BTag], brandId);
          continue
        }

        const newItem: ActivitiesReportResponse = {
          transferId: '',
          playerId: csvItem[csvSales.PlayerID],
          activityDate: csvItem[csvSales.Date],
          brandId,
          affiliateId: Number(tagInfo.a),

          grossRevenue: money.parseMoney(
            Number(csvItem[csvSales.CasinoRevenue]) + Number(csvItem[csvSales.SportsbookRevenue]),
          ),
          bonuses: money.parseMoney(
            Number(csvItem[csvSales.CasinoBonus]) + Number(csvItem[csvSales.SportsbookBonus]),
          ),
          adjustments: money.parseMoney(csvItem[csvSales.Chargeback]),
          turnover: money.parseMoney(
            Number(csvItem[csvSales.CasinoStake]) + Number(csvItem[csvSales.SportsbookStake]),
          ),
          deposits: money.parseMoney(csvItem[csvSales.Deposit]), // 168.69168248
        };
        logger.debug('updateSBTechBrand new activity item',{newItem});
        activities.push(newItem);
      }

      await operations.updateActivities(pg, activities, date);
    });
    logger.debug('updateSBTechBrand activities done');
  }

};

module.exports = async (date: DateTime = DateTime.local()) => {
  logger.info('updateSBTechData: started...');

    try {
      await updateSBTechBrand('SB', date);
    } catch (e) {
      logger.error(`updateSBTechData failed for brand SB`, e);
    }


  const affiliates = await affiliatesRepository.getActiveAffiliates(pgs, date.year, date.month);
  logger.debug('updateData affiliates', affiliates.length);
  for (const affiliate of affiliates) {
    await pgs.transaction(async (pg) => {
      logger.debug('updateData affiliate', affiliate.id);
      try {
        await operations.updateAffiliateCommission(pg, affiliate.id, date.year, date.month);
      } catch (e) {
        logger.error(`updateData > updateAffiliateCommission: failed for affiliateId '${affiliate.id}'`, e);
      }
    });
  }

  logger.info('updateSBTechData: completed.');
};
