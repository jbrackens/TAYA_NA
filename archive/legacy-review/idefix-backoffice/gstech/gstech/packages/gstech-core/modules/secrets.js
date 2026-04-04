/* @flow */
const fs = require('fs');
const path = require('path');

const joi = require('joi');
const validate = require('./validate');

const SECRETS_DIR = '/run/secrets';

const secrets: { [string]: string } = {};
const load = (dir: string) => {
  if (fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()) {
    fs.readdirSync(dir).forEach((file) => {
      const f = path.join(dir, file);
      if (fs.lstatSync(f).isFile()) {
        secrets[file] = fs.readFileSync(f, 'utf8').toString().trim();
      } else {
        load(f);
      }
    });
  }
};

load(SECRETS_DIR);

export type SecretVars = {
  PRIVATE_KEY: string,
};

const secretVarsSchema = joi.object({
  PRIVATE_KEY: joi.string().trim().default('4AvmRSdBmVicpVqbSrA4XR/J8gpukLxwTZTzVOArOFs=|f031N53S8SauLGMUL/mEGX8WuPvak14KFoICCm8HWPA='),
}).unknown().required();

const envVars: SecretVars = validate<SecretVars>(secrets, secretVarsSchema, 'Secret schema validation failed');

module.exports = envVars;
