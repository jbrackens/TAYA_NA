/* @flow */
/* eslint-disable no-unused-vars */

type Money = number;
type Id = number;
type IPAddress = string;
type UUID = string;
type Timestamp = string;

type Integer = number;
type Float = number;

type CountryId = string;
type LanguageId = string;
type CurrencyId = string;

type GSError = {
  code: number,
  message: string,
};

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type BrandId = 'CJ' | 'KK' | 'LD' | 'OS' | 'FK' | 'SN' | 'VB';

// TODO: we should probably be more precise about Knex types here, eventually...
type Knex = Knex$Knex<any> | Knex$Transaction<any>;

// For tests
declare var expect: typeof Chai$Expect;
declare var clean: any;
declare var setup: any;
