/* @flow */
const knownIpsOld = [
  '188.226.186.81',
  '213.165.181.93',
  '180.214.71.134',
  '88.196.254.220',
  '178.23.129.249',
  '80.85.99.185',
  '80.85.99.186',
  '178.62.229.136',
  '34.240.234.39',
  '54.73.204.216', // twingate vpn
  '213.165.183.151', // twingate vpn
  '34.255.111.148', // twingate vpn
  '54.228.150.30', // twingate vpn
];
const tempKnownIps = [
  '78.130.168.18 ',
  '95.87.212.251',
  '79.124.5.215',
  '79.124.5.216',
  '79.124.5.217',
  '79.124.5.218',
  '79.124.5.208',
]; // red tiger IPs

const knownIps = [...knownIpsOld, ...tempKnownIps];

const check = (ip: IPAddress): boolean => knownIps.includes(ip);

module.exports = { check };
