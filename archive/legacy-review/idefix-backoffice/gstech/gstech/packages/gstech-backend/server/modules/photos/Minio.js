/* @flow */
const Minio = require('minio');
const { v1: uuid } = require('uuid');
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');

const minioClient = new Minio.Client({
  endPoint: config.minio.host,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
  region: config.minio.region,
});

if (process.env.NODE_ENV !== 'production') {
  minioClient.bucketExists(config.minio.bucketName, (err, exists) => {
    if (err) return logger.error('XXX MINIO:bucketExists', { err });
    if (!exists)
      minioClient.makeBucket(config.minio.bucketName, config.minio.region, (error) => {
        if (error) return logger.error('XXX MINO:makeBucket', { err: error });
        return logger.info('+++ MINIO:makeBucket');
      });
    return logger.info('+++ MINIO:bucketExists');
  })
}

const getPhoto = (photoId: string): any => minioClient.getObject(config.minio.bucketName, photoId);

const uploadPhoto = async (buffer: any): Promise<string> => {
  const photoId = uuid();
  await minioClient.putObject(config.minio.bucketName, photoId, buffer);
  return photoId;
};

const removePhoto = (photoId: string): any =>
  minioClient.removeObject(config.minio.bucketName, photoId);

module.exports = {
  getPhoto,
  uploadPhoto,
  removePhoto,
};
