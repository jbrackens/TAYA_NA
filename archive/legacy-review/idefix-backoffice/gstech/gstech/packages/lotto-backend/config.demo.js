/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { LottoProvidersConfiguration } from './server/types';

const configuration: Configuration<LottoProvidersConfiguration> = {
  publicKey: '43Db5DduLtSY19ZJAVfFwbh3BxhFSGEjE7L+fLBxnAc=|piGkPlMIyT0beXYdf1HZ4awiWnDOpHIOlLPAOYdD18A=',
  data: {
    providers: {
      lottoWarehouse: {
        url: 'https://api-cs.lottowarehouse.com/api/v2',
        userid: '0029b85e-fe6d-4f90-83db-d3a4369d7c19',
        password: '82LbZUYKHv5TCwFC',
        secretKey: 'c7ea26b6d5601fb68b0eS',
      },
    },
  },
};

module.exports = configuration;
