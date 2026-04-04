/* @flow */
import type { Brand } from 'gstech-core/modules/types/backend';

const pg = require('gstech-core/modules/pg');

const getInfo = (brandId: string): Promise<Brand> => pg('brands').first('name').where({ id: brandId });

module.exports = { getInfo };
