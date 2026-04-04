/* @flow */
const Minio = require('minio');

const logger = require('./logger');
const config = require('./config');

const minioClient: any = new Minio.Client({
  endPoint: config.minio.host,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
  region: config.minio.region,
});

if (!config.isProduction && config.minio.bucketName) {
  minioClient.makeBucket(config.minio.bucketName, config.minio.region, (err) => {
    if (err) {
      return logger.debug('Minio: Cannot create bucket:', err.message);
    }
    return logger.debug('Minio: Bucket created');
  });
}

module.exports = minioClient;
