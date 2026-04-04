// @flow
 
const path = require('path');
const url = require('url');
const ipRangeCheck = require('ip-range-check');

const logger = require('./logger');

const projectName = process.env.SITE_NAME || 'luckydino';

const CURRENT_TC_VERSION = 15;
const NEW_USER_TC_VERSION = 15;
const IP_RANGES = ['54.93.254.128/26', '18.194.95.64/26', '3.124.123.128/25', '3.67.7.128/25'];
const KNOWN_IPS = [
  '127.0.0.1',
  '::1',
  '188.226.186.81',
  '94.22.187.206',
  '::ffff:127.0.0.1',
  '46.165.245.107',
  '213.165.181.93',
  '213.165.167.226',
  '159.20.31.203',
  '195.158.80.207',
  '80.235.87.160',
  '88.196.254.220',
  '80.85.99.185',
  '80.85.99.186',
  '34.240.234.39', // twingate vpn
  '54.73.204.216', // twingate vpn
  '213.165.183.151', // twingate vpn
  '34.255.111.148', // twingate vpn
  '54.228.150.30', // twingate vpn
];
const WHITELISTED_IPS = [
  '180.214.71.134',
  '94.155.130.71',
  '159.20.29.42',
  '5.150.237.241',
  '54.211.26.116',
  '54.145.3.115',
  '75.101.153.184',
  '174.129.31.69',
  '54.204.64.245',
  '54.161.29.57',
  '54.166.48.184',
  '217.115.53.60',
  '54.209.52.55', // CrazyEgg
  '3.91.64.39', // CrazyEgg
  '100.25.42.80', // CrazyEgg
  '54.91.31.32', // CrazyEgg
  '178.23.129.249', // EEG general
  '178.62.229.136', // penetration test tool
  '34.240.234.39', // twingate vpn
  '54.73.204.216', // twingate vpn
  '213.165.183.151', // twingate vpn
  '34.255.111.148', // twingate vpn
  '54.228.150.30', // twingate vpn
];
const EMAIL_DOMAIN_BLACKLIST = [
  'fextemp.com',
  'merepost.com',
  'any.pink',
  'vreaa.com',
  'touchend.com',
  'tiuas.com',
  'royalka.com',
  'tipent.com',
  'v1zw.com',
  'weishu8.com',
  'viperace.com',
  'saykocak.com',
  'saykocak.com',
  'clout.wiki',
  'hexi.pics',
  'bagonew.com',
  'cnavaro.com',
  'avidapro.com',
  'cazlv.com',
  'cwmxc.com',
  'chodyi.com',
  'finews.biz',
  'curuth.com',
  'tbnana.com',
  'ziinx.com.mx',
];

const projectFile = (name: string): string => path.join(__dirname, '/../', projectName, name);
const markdownFile = (name: string): string => path.join(__dirname, '/../../markdown/', projectName, name);
const requireProjectFile = (name: string): string => require(projectFile(name));
const requireProjectClientFile = (name: string): string => require(`../../client/${project()}/${name}`);
const project = (): string => projectName;

logger.info('RUNNING PROJECT', projectName);

const conf = require(projectFile('configuration'));

const redisOptions = (): {
  port: number,
  host: ?string,
  pass: ?string,
  auth: ?string,
  password: ?string,
}[] => {
  const redisUrls = (process.env.SESSION_REDIS_URL || 'redis://localhost:7006').split(',');
  return redisUrls.map((u) => {
    const redisUrl = url.parse(u);
    const redisAuth = (redisUrl.auth || '').split(':');
    return {
      port: +redisUrl.port || 6379,
      host: redisUrl.hostname,
      pass: redisAuth[1],
      auth: redisAuth[1],
      password: redisAuth[1],
    };
  });
};

const commonConfiguration = {
  knownIps: KNOWN_IPS,
  whitelistedIps: WHITELISTED_IPS,
  currentTcVersion: CURRENT_TC_VERSION,
  newUserTcVersion: NEW_USER_TC_VERSION,
  isIpAllowed: (ip: string): boolean => IP_RANGES.some((range) => ipRangeCheck(ip, range)) || KNOWN_IPS.includes(ip),
  isEmailBlacklisted: (email: string): boolean => EMAIL_DOMAIN_BLACKLIST.some((domain) => email.toLowerCase().endsWith(domain)),
};

module.exports = {
    redisOptions,
    projectFile,
    project,
    requireProjectFile,
    requireProjectClientFile,
    markdownFile,
    ...commonConfiguration,
    ...conf
}
