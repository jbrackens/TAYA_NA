/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { ComplianceProvidersConfiguration } from './server/types';

const configuration: Configuration<ComplianceProvidersConfiguration> = {
  publicKey: '43Db5DduLtSY19ZJAVfFwbh3BxhFSGEjE7L+fLBxnAc=|piGkPlMIyT0beXYdf1HZ4awiWnDOpHIOlLPAOYdD18A=',
  data: {
    providers: {
      spelpaus: {
        url: 'https://testapi.spelpaus.se/api',
        actorId: '20',
        apiKey: 'GS[maT286X+E/AFU+C6Ox0jmNJbg8suPVm6OV8M9QMeMTiLqLaKJAWHbrm/l6Fc8BKk1lbT/23UlzVjPLelya4t2A9Q5U3asn95VcSLBDspY/f80iKR5FQcDmUaNFk198aM5mf7fw==]',
      },
    },
    emailCheck: {
      apiKey: 'GS[2rFQIHc8zbKz+oAySeadzrEbTVIuGXDFFvFEJZVSkBklp8CnWSo3AA/Yu00SxEELmjsq+VyU70MMCxR/cHOoCeeJEuawNIDy4C0HckD/ye4DfsD5Woz6jysFddm95Ougt7cFMzPGfZVWoZXtHA==]',
    },
  },
};

module.exports = configuration;
