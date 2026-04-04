/* @flow */
const fileTypeStream = require('file-type-stream');
const { PassThrough } = require('stream');
const logger = require('gstech-core/modules/logger');
const Minio = require('./Minio');

const getPhoto = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { photoId } = req.params;
    const photoStream = await Minio.getPhoto(photoId);

    const body = new PassThrough();

    const result = await new Promise<{mime: string}>((resolve) => {
      photoStream.pipe(fileTypeStream.default(resolve)).pipe(body);
    });
    if (result != null) {
      const { mime } = result;
      res.setHeader('content-type', mime);
    }
    return body.pipe(res);
  } catch (err) {
    logger.warn('Get photo failed', err);
    return next(err);
  }
};

const uploadPhoto = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { file } = req;
    const photoId = await Minio.uploadPhoto(file.buffer);

    return res.status(201).json({
      id: photoId,
      originalName: file.originalname,
    });
  } catch (err) {
    logger.warn('Upload photo failed', err);
    return next(err);
  }
};

const removePhoto = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { photoId } = req.params;
    const response = await Minio.removePhoto(photoId);

    return res.status(200).json(response);
  } catch (err) {
    logger.warn('Remove photo failed', err);
    return next(err);
  }
};

module.exports = {
  getPhoto,
  uploadPhoto,
  removePhoto,
};
