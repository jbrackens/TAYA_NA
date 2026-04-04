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

type GSError = {|
  code: number,
  message: string,
|};

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type BrandId = 'CJ' | 'KK' | 'LD' | 'OS';

type Knex = Knex$Knex | Knex$Transaction<*>;
// TODO: this is temporary hack to make types work for gstech-backend
type Knex2 = Knex$Knex;

// For tests
declare var expect: any;
declare var clean: any;
declare var setup: any;
