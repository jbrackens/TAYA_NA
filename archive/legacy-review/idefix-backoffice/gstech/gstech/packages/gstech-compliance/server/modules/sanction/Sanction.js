/* @flow */
const crypto = require('crypto');
const https = require('https');
const moment = require('moment-timezone');
const { parse } = require('csv-parse');
const flatten = require('lodash/flatten');
const xml2js = require('xml2js');
const MS = require('minisearch');
const isocountries = require('i18n-iso-countries');
const fs = require('fs');

const { axios } = require('gstech-core/modules/axios');
const logger = require('gstech-core/modules/logger');

type Address = {
  street?: string,
  city?: string,
  country?: string,
  postCode?: string,
};

type SearchElement = {
  id: number,
  list: string,
  name: string,
  reference: string,
  aliases: string[],
  addresses: Address[],
  dateOfBirths: {
    type: string,
    date?: string,
    year?: string,
    from?: string,
    to?: string,
  }[],
};

type DateOfBirths = {
  [key: string]: string,
};

const dateOfBirthTypes: DateOfBirths = {
  exact: 'exact',
  approximately: 'approximately',
  between: 'between',
};

type CountryCodes = {
  [key: string]: string,
};

const missingCountriesCodes: CountryCodes = {
  undetermined: 'XX',
  Syria: 'SY',
  'Region: Gaza': 'PS',
  Palestinian: 'PS',
  Burma: 'MM',
  'Congo, Democratic Republic of the': 'CD',
  'Korea, North': 'KP',
  'Cote d Ivoire': 'CI',
  'Congo, Republic of the': 'CG',
  'Region: Kafia Kingi': 'SD',
  Macau: 'MO',
  'North Macedonia, The Republic of': 'MK',
  'Region: West Bank': 'PS',
  'Korea, South': 'KR',
  Moldova: 'MD',
  Laos: 'LA',
  "Democratic People's Republic of Korea": 'KP',
  'United Kingdom of Great Britain and Northern Ireland': 'GB',
  'Viet Nam': 'VN',
  na: 'XX',
  'former Soviet Union': 'RU',
};

const getCountryAlpha2Iso = (country: string): string => {
  if (!country || country.length === 0) return country;
  let countryIsoCode = isocountries.getAlpha2Code(country, 'en');
  if (country && !countryIsoCode) countryIsoCode = missingCountriesCodes[country];
  if (country && !countryIsoCode) logger.warn(`!!! getCountryAlpha2Iso() - Country missing:`, country);
  if (country && countryIsoCode && countryIsoCode.length !== 2) logger.warn(`!!! getCountryAlpha2Iso() - Country code invalid:`, country, countryIsoCode);
  return countryIsoCode;
};

const savePersonListCsv = false;

const MiniSearch: {
  getInstance: (update?: boolean) => any,
  getMetadata: () => { EU: string, UN: string, US: string },
  updateMetadata: (list: 'UN' | 'US' | 'EU', data: string) => void,
} = (() => {
  let instance: Object;
  const metadata = { UN: '', US: '', EU: '' };

  function createInstance() {
    return new MS({
      fields: ['name', 'aliases'],
      storeFields: ['list', 'name', 'reference', 'aliases', 'addresses', 'dateOfBirths'],
    });
  }

  return {
    getInstance(update?: boolean = false) {
      if (update || !instance) instance = createInstance();
      return instance;
    },
    updateMetadata(list: 'UN' | 'US' | 'EU', data: string) {
      logger.debug(`>>> [SANCTION] Registered ${list}@${data}`, { list, data });
      metadata[list] = data;
    },
    getMetadata() {
      return metadata;
    },
  };
})();

const handleEuSanctionCSV = (csvLines: Array<Array<string>>): SearchElement[] => {
  const personList: SearchElement[] = [];
  let id = 1;
  let currentSearchElement: SearchElement;
  // eslint-disable-next-line no-plusplus
  for (let index = 1; index < csvLines.length; index++) {
    const record = csvLines[index];
    const type = record[8];
    // eslint-disable-next-line no-continue
    if (type !== 'person') continue;
    const reference = record[2];
    const name = record[19];
    if (!currentSearchElement || reference !== currentSearchElement.reference) {
      if (currentSearchElement) personList.push(currentSearchElement);
      currentSearchElement = { id, list: 'EU', name, reference, aliases: [], addresses: [], dateOfBirths: [] };
      id += 1;
    }
    if (name && name !== currentSearchElement.name && !currentSearchElement.aliases.includes(name)) currentSearchElement.aliases.push(name);
    const city = record[34];
    const street = record[35];
    const postCode = record[37];
    const country = record[42];
    const address: Address = { city, street, postCode, country };
    if (street || city || country || postCode) {
      currentSearchElement.addresses.push(address);
    }
    const dateOfBirth = record[54];
    const yearOfBirth = record[57];
    if (dateOfBirth) currentSearchElement.dateOfBirths.push({ type: dateOfBirthTypes.exact, date: dateOfBirth });
    if (!dateOfBirth && yearOfBirth) currentSearchElement.dateOfBirths.push({ type: dateOfBirthTypes.exact, year: yearOfBirth });
  }
  return personList;
};

const savePersonListAsCSV = (personList: SearchElement[], filename: string) => {
  const header = 'id;reference;list;name;aliases;addresses;postCodes;cities;countries;dateofbirth\n';
  const csvData = personList
    .map((person, index) => {
      logger.silly(`___ savePersonListAsCSV ${new Intl.NumberFormat('en-US', { minimumIntegerDigits: 5, useGrouping: false }).format(index)}`, person);
      const { id, list, name, reference, aliases, addresses, dateOfBirths } = person;

      const aliasesString = aliases.join(' | ');

      addresses.forEach((address) => {
        if (!address.street && !address.city && !address.country && !address.postCode) {
          logger.warn(`!!! [SANCTION] ${index} Empty address:`, address, person);
        }
      });
      const addressesString = addresses
        .map((address) => address.street)
        .filter(Boolean)
        .join(' | ');
      const postCodes = addresses
        .map((address) => address.postCode)
        .filter(Boolean)
        .join(' | ');
      const cities = addresses
        .map((address) => address.city)
        .filter(Boolean)
        .join(' | ');
      const countries = addresses
        .map((address) => address.country)
        .filter(Boolean)
        .join(' | ');
      const dobToString = (dob: { type: string, date?: string, year?: string, from?: string, to?: string }) => {
        const { type, date = '', year = '', from, to } = dob;
        if (type === dateOfBirthTypes.exact && (!date || date.length === 0) && (!year || year.length === 0)) logger.warn('!!! [SANCTION] Invalid exact date', dob);
        if (type === dateOfBirthTypes.approximately && (!date || date.length === 0) && (!year || year.length === 0)) logger.warn('!!! [SANCTION] Invalid approximate date', dob);
        if (type === dateOfBirthTypes.between && (!from || from.length === 0) && (!to || to.length === 0)) logger.warn('!!! [SANCTION] Invalid between date', dob);

        if (type === dateOfBirthTypes.exact) return `${date ?? year}`;
        if (type === dateOfBirthTypes.approximately) return `${date || year} circa`;
        if (type === dateOfBirthTypes.between) return `from ${from ?? ''} to ${to ?? ''}`;
        logger.warn('!!! [SANCTION] Invalid date type', dob);
        return 'invalid date type';
      };
      const dateOfBirthsString = dateOfBirths.map(dobToString).join(' | ');
      return `${id};${reference};${list};${name};${aliasesString};${addressesString};${postCodes};${cities};${countries};${dateOfBirthsString}`;
    })
    .join('\n');

  const filePath = `./${filename}.csv`;
  fs.writeFileSync(filePath, header + csvData);
  return filePath;
};

const prepareEu = async (): Promise<SearchElement[]> =>
  new Promise((resolve, reject) => {
    logger.info('+++ [SANCTION] EU Preparing...');
    const url = 'https://webgate.ec.europa.eu/fsd/fsf/public/files/csvFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw';

    const records = [];
    const parser = parse({ delimiter: ';', from_line: 2 });
    parser.on('readable', () => {
      let record;
      // eslint-disable-next-line no-cond-assign
      while ((record = parser.read()) !== null) {
        records.push(record);
      }
    });

    parser.on('error', (err) => {
      logger.error('XXX [SANCTION] EU', err);
      reject(err);
    });
    parser.on('end', () => {
      MiniSearch.updateMetadata('EU', moment(records[1][0], 'DD/MM/YYYY').format('YYYY-MM-DD'));
      const personList = handleEuSanctionCSV(records);
      if (savePersonListCsv) {
        const personListFilePath = savePersonListAsCSV(personList, 'eu_sanction_list');
        logger.info('+++ [SANCTION] EU Saved Compiled CSV', { personListFilePath });
      }
      logger.info('+++ [SANCTION] EU', { personCount: personList.length, csvLinesHandled: records.length });
      resolve(personList);
    });
    axios.get(url, { responseType: 'stream' }).then(({ data }) => data.pipe(parser));
  });

const prepareUn = async (): Promise<SearchElement[]> => {
  logger.info('+++ [SANCTION] UN Preparing...');
  try {
    const allowLegacyRenegotiationforNodeJsOptions = {
      // https://dev.to/johnnyreilly/nodejs-18-axios-and-unsafe-legacy-renegotiation-disabled-18ki
      // $FlowIgnore
      httpsAgent: new https.Agent({ secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT }),
    };
    const url = 'https://scsanctions.un.org/resources/xml/en/consolidated.xml';
    const { data: resp } = await axios({
      ...allowLegacyRenegotiationforNodeJsOptions,
      url,
      method: 'GET',
      responseType: 'text',
    });
    const result = await xml2js.parseStringPromise(resp, { explicitArray: false, trim: true });
    MiniSearch.updateMetadata('UN', moment(result.CONSOLIDATED_LIST.$.dateGenerated).format('YYYY-MM-DD'));

    const personList = result.CONSOLIDATED_LIST.INDIVIDUALS.INDIVIDUAL.map((item, i) => {
      const name = [item.FIRST_NAME, item.SECOND_NAME, item.THIRD_NAME, item.FOURTH_NAME].filter(Boolean).join(' ').trim();

      const dateOfBirths: {
        type: string,
        date?: string,
        year?: string,
        from?: string,
        to?: string,
      }[] = [];
      const getAliases = (aliasList: { ALIAS_NAME: string, DATE_OF_BIRTH?: string }[] | { ALIAS_NAME: string, DATE_OF_BIRTH?: string }): string[] => {
        if (!aliasList) return [];
        const aliases = Array.isArray(aliasList) ? aliasList : [aliasList];
        return aliases
          .map((alias) => {
            if (alias.DATE_OF_BIRTH) dateOfBirths.push({ type: dateOfBirthTypes.exact, date: alias.DATE_OF_BIRTH });
            return alias.ALIAS_NAME;
          })
          .filter(Boolean)
          .filter((alias) => alias.length > 0);
      };
      const aliases = getAliases(item.INDIVIDUAL_ALIAS);
      if (item.NAME_ORIGINAL_SCRIPT) aliases.push(item.NAME_ORIGINAL_SCRIPT);

      const dobs = Array.isArray(item.INDIVIDUAL_DATE_OF_BIRTH) ? item.INDIVIDUAL_DATE_OF_BIRTH : [item.INDIVIDUAL_DATE_OF_BIRTH];
      dobs.forEach((dob) => {
        if (!dob || dob.TYPE_OF_DATE?.length === 0) return;
        if (dob.TYPE_OF_DATE === 'EXACT') {
          if (dob.DATE) dateOfBirths.push({ type: dateOfBirthTypes.exact, date: dob.DATE });
          if (dob.YEAR) dateOfBirths.push({ type: dateOfBirthTypes.exact, year: dob.YEAR });
        }
        if (dob.TYPE_OF_DATE === 'APPROXIMATELY') {
          if (dob.YEAR) dateOfBirths.push({ type: dateOfBirthTypes.approximately, year: dob.YEAR });
          if (dob.DATE) dateOfBirths.push({ type: dateOfBirthTypes.approximately, date: dob.DATE });
        }
        if (dob.TYPE_OF_DATE === 'BETWEEN') {
          dateOfBirths.push({ type: dateOfBirthTypes.between, from: dob.FROM_YEAR, to: dob.TO_YEAR });
        }
      });

      const addresses: Address[] = [];
      const places = [item.INDIVIDUAL_ADDRESS, item.INDIVIDUAL_PLACE_OF_BIRTH].filter(Boolean);
      places.forEach((place) => {
        const placeArray = Array.isArray(place) ? place : [place];
        placeArray.forEach((p) => {
          const { CITY, COUNTRY, STREET, ZIP_CODE } = p;
          const address: Address = {};
          if (CITY) address.city = CITY;
          if (COUNTRY) address.country = getCountryAlpha2Iso(COUNTRY);
          if (STREET) address.street = STREET;
          if (ZIP_CODE) address.postCode = ZIP_CODE;
          if (CITY || COUNTRY || STREET || ZIP_CODE) addresses.push(address);
        });
      });
      if (item.NATIONALITY?.VALUE) {
        const { VALUE } = item.NATIONALITY;
        const nationalities = Array.isArray(VALUE) ? VALUE : [VALUE];
        const isoCountries = nationalities.filter((ctry) => ctry && ctry.length > 0).map((countryString) => getCountryAlpha2Iso(countryString));
        const uniqueIsoCountries = [...new Set(isoCountries)];
        if (uniqueIsoCountries && uniqueIsoCountries.length > 0) uniqueIsoCountries.forEach((isoCountryCode) => addresses.push({ country: isoCountryCode }));
      }
      return {
        id: 100000 + i,
        list: 'UN',
        name,
        reference: item.REFERENCE_NUMBER,
        aliases,
        addresses,
        dateOfBirths,
      };
    });
    if (savePersonListCsv) {
      const personListFilePath = savePersonListAsCSV(personList, 'un_sanction_list');
      logger.info('+++ [SANCTION] UN Saved Compiled CSV', { personListFilePath });
    }
    return personList;
  } catch (e) {
    logger.error('XXX [SANCTION] UN', e);
    return [];
  }
};

const prepareUs = async (): Promise<SearchElement[]> => {
  logger.info('+++ [SANCTION] US Preparing...');
  const url = 'https://www.treasury.gov/ofac/downloads/sdn.xml';
  const { data: resp } = await axios.get(url, { responseType: 'text' });
  const result = await xml2js.parseStringPromise(resp, { explicitArray: false, trim: true });
  MiniSearch.updateMetadata('US', moment(result.sdnList.publshInformation.Publish_Date, 'MM/DD/YYYY').format('YYYY-MM-DD'));
  const fullDateRegex = /^\d{2} \w{3} \d{4}$/;
  const monthYearRegex = /^\w{3} \d{4}$/;
  const yearRegex = /^\d{4}$/;
  const personList = result.sdnList.sdnEntry
    .filter(({ sdnType }) => sdnType === 'Individual')
    .map((item, i) => {
      const { firstName, lastName } = item;
      const name = [firstName, lastName].filter(Boolean).join(' ').trim();

      const getAliases = (akaList: { aka: { firstName: string, lastName: string }[] | { firstName: string, lastName: string } }): string[] => {
        if (!akaList) return [];
        const { aka } = akaList;
        const aliasList = Array.isArray(aka) ? aka : [aka];
        return aliasList.map((alias) => [alias.firstName, alias.lastName].filter(Boolean).join(' '));
      };
      const aliases = getAliases(item.akaList);

      const addresses = [];
      if (item.addressList?.address) {
        const { address1, city, postalCode, country } = item.addressList.address;
        const countryIsoCode = getCountryAlpha2Iso(country);
        if ((address1 && address1.length > 0) || (city && city.length > 0) || (postalCode && postalCode.length > 0) || (country && country.length > 0))
          addresses.push({ street: address1, city, postCode: postalCode, country: countryIsoCode });
      }

      const dateOfBirths: { type: string, date?: string, year?: string, from?: string, to?: string }[] = [];
      if (item.dateOfBirthList?.dateOfBirthItem) {
        const dobList = Array.isArray(item.dateOfBirthList?.dateOfBirthItem) ? item.dateOfBirthList?.dateOfBirthItem : [item.dateOfBirthList?.dateOfBirthItem];
        dobList.forEach((dob) => {
          const { dateOfBirth } = dob;
          if (dateOfBirth.includes('circa')) {
            const circaDate = dateOfBirth.replace('circa', '').trim();
            if (fullDateRegex.test(circaDate)) {
              const date = moment(circaDate, 'DD MMM YYYY').format('YYYY-MM-DD');
              dateOfBirths.push({ type: dateOfBirthTypes.approximately, date });
            }
            if (monthYearRegex.test(circaDate)) {
              const date = moment(circaDate, 'MMM YYYY').format('YYYY-MM');
              dateOfBirths.push({ type: dateOfBirthTypes.approximately, date });
            }
            if (yearRegex.test(circaDate)) {
              dateOfBirths.push({ type: dateOfBirthTypes.approximately, year: circaDate });
            }
          } else if (dateOfBirth.includes(' to ')) {
            const [fromDate, toDate] = dateOfBirth.split(' to ');
            if (fullDateRegex.test(fromDate) && !fullDateRegex.test(toDate)) logger.warn(`!!! [SANCTION] US weird range ${dateOfBirth}`, name, dob, item);
            if (monthYearRegex.test(fromDate) && !monthYearRegex.test(toDate)) logger.warn(`!!! [SANCTION] US weird range ${dateOfBirth}`, name, dob, item);
            if (yearRegex.test(fromDate) && !yearRegex.test(toDate)) logger.warn(`!!! [SANCTION] US weird range ${dateOfBirth}`, name, dob, item);
            if (fullDateRegex.test(fromDate) && fullDateRegex.test(toDate)) {
              const from = moment(fromDate, 'DD MMM YYYY').format('YYYY-MM-DD');
              const to = moment(toDate, 'DD MMM YYYY').format('YYYY-MM-DD');
              dateOfBirths.push({ type: dateOfBirthTypes.between, from, to });
            }
            if (monthYearRegex.test(fromDate) && monthYearRegex.test(toDate)) {
              const from = moment(fromDate, 'MMM YYYY').format('YYYY-MM');
              const to = moment(toDate, 'MMM YYYY').format('YYYY-MM');
              dateOfBirths.push({ type: dateOfBirthTypes.between, from, to });
            }
            if (yearRegex.test(fromDate) && yearRegex.test(toDate)) {
              dateOfBirths.push({ type: dateOfBirthTypes.between, from: fromDate, to: toDate });
            }
          } else {
            if (fullDateRegex.test(dateOfBirth)) {
              const fullDate = moment(dateOfBirth, 'DD MMM YYYY').format('YYYY-MM-DD');
              dateOfBirths.push({ type: dateOfBirthTypes.exact, date: fullDate });
            }
            if (monthYearRegex.test(dateOfBirth)) {
              const monthYear = moment(dateOfBirth, 'MMM YYYY').format('YYYY-MM');
              dateOfBirths.push({ type: dateOfBirthTypes.exact, date: monthYear });
            }
            if (yearRegex.test(dateOfBirth)) {
              dateOfBirths.push({ type: dateOfBirthTypes.exact, year: dateOfBirth });
            }
          }
        });
      }
      return {
        id: 200000 + i,
        list: 'US',
        reference: `US.${item.uid}`,
        name,
        aliases,
        addresses,
        dateOfBirths,
      };
    });
  if (savePersonListCsv) {
    const personListFilePath = savePersonListAsCSV(personList, 'us_sanction_list');
    logger.info('+++ [SANCTION] US Saved Compiled CSV', { personListFilePath });
  }
  logger.info('+++ [SANCTION] US', { personCount: personList.length, recordCount: result.sdnList.publshInformation.Record_Count });
  return personList;
};

const prepareSearchInstance = async (update?: boolean = false): Promise<any> => {
  const miniSearchInstance = MiniSearch.getInstance(update);
  return miniSearchInstance.addAllAsync(await Promise.all([prepareEu(), prepareUn(), prepareUs()]).then(flatten));
};

module.exports = {
  prepareSearchInstance,
  MiniSearch,
};
