/* @flow */
const Minio = require('minio');

const logger = require('./logger');
const config = require('./config');

const minioClient = new Minio.Client({
  endPoint: config.minio.host,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
});

if (process.env.NODE_ENV !== 'production') {
  minioClient.makeBucket('docker', 'us-east-1', (err) => {
    if (err) {
      return logger.debug('Minio: Cannot create bucket:', err.message);
    }
    return logger.debug('Minio: Bucket created');
  });
}

module.exports = minioClient;
