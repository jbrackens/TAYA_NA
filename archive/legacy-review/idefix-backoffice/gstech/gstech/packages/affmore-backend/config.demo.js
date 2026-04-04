/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { AffmoreConfiguration } from './server/config';

const configuration: Configuration<AffmoreConfiguration> = {
  publicKey: '43Db5DduLtSY19ZJAVfFwbh3BxhFSGEjE7L+fLBxnAc=|piGkPlMIyT0beXYdf1HZ4awiWnDOpHIOlLPAOYdD18A=',
  data: {
    sftpCfg: {
      host: 'argyll-s-srv01.flipsports.net',
      port: 22,
      username: 'vladimir',
      password: 'GS[+JHTZESDc+BON9UB0QSkYl9uBRjk7tTHEFRO5m3DCGGgOlpaDg79tVo1HYpeLaWFXYgO7+nm278=]',
      brandSuffix: 'Sportnation',
      folderReg: 'Downloads/',
      folderSales: 'Sales/',
    },
  },
};

module.exports = configuration;
