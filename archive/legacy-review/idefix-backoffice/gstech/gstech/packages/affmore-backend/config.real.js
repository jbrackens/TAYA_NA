/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { AffmoreConfiguration } from './server/config';

const configuration: Configuration<AffmoreConfiguration> = {
  publicKey: '6AFW6Ko25Hoagc50K/OteolSgHdwAddxFiTez/oZUSM=|/x/OVP7Maux5RDwl27zlI16NaAExrh3gKvDIhszyNyE=',
  data: {
    sftpCfg: {
      host: 'argyll-s-srv01.flipsports.net',
      port: 22,
      username: 'vladimir',
      password: 'GS[G5zcot/FBshWBTqF6/xqjaVPNR2WBCWq1qWvQwj59g8EU7pe8wWh7n0P3n2UYuJOPzfRdG3nUQQ=]',
      brandSuffix: 'Sportnation',
      folderReg: 'Downloads/',
      folderSales: 'Sales/',
    },
  },
};

module.exports = configuration;
