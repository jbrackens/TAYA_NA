/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { LottoProvidersConfiguration } from './server/types';

const configuration: Configuration<LottoProvidersConfiguration> = {
  publicKey: '6AFW6Ko25Hoagc50K/OteolSgHdwAddxFiTez/oZUSM=|/x/OVP7Maux5RDwl27zlI16NaAExrh3gKvDIhszyNyE=',
  data: {
    providers: {
      lottoWarehouse: {
        url: 'https://api.lottowarehouse.com/api/v2',
        userid: '86f4e3da-2957-4104-b06b-aa2e54fb27a2',
        password: 'GS[Z0fB9Chy4fv5zCO+5L14IjIf79UDxhQozJVeMGCZYGekswTy04r7AHg8zLbDXNLhokuSWQ==]',
        secretKey: 'GS[7rUpkFbLPE8BgxVxQhqw/QEl3IUvwkyvPaPg19JxmbPDA8C68WSW5rz45Vmoxgdc/WGDLZXHiORK/rUAWg==]',
      },
    },
  },
};

module.exports = configuration;
