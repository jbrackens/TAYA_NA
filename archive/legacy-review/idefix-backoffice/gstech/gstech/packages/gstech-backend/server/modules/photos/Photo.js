/* @flow */
const pg = require('gstech-core/modules/pg');

const PHOTOS = 'photos';

module.exports = {
  getTaskPhotos: (taskId: Id): Promise<{ }[]> =>
    pg(PHOTOS)
      .select('*')
      .where({ taskId }),
  createTaskPhotos: (taskId: Id, photos: { id: Id, originalName: string }[]): Promise<Id> => {
    const taskPhotos = photos.map(photo => ({
      id: photo.id,
      originalName: photo.originalName,
      taskId,
    }));

    return pg(PHOTOS)
      .insert(taskPhotos)
      .returning('id')
      .then((records) => records.map(({ id }) => id));
  },
};
