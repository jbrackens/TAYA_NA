/* @flow */
import type { Config } from 'gstech-core/modules/types/config';

export type LottoWarehouseConfiguration = {
  url: string,
  userid: string,
  password: string,
  secretKey: string,
};

export type LottoProvidersConfiguration = {
  providers: {
    lottoWarehouse: LottoWarehouseConfiguration,
  },
};

export type LottoBackendConfig = {
  ...LottoProvidersConfiguration,
  ...Config,
};
