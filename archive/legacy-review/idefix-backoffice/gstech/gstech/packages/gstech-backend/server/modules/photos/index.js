// @flow
const routes = require('./routes');
const Photo = require('./Photo');

module.exports = {
  getTaskPhotos: Photo.getTaskPhotos,
  createTaskPhotos: Photo.createTaskPhotos,
  getPhotoHandler: routes.getPhoto,
  uploadPhotoHandler: routes.uploadPhoto,
  removePhotoHandler: routes.removePhoto,
};
