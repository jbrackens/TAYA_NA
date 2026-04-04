/* @flow */

const Kyc = require('./Kyc');
const routes = require('./routes');
const apiRoutes = require('./api-routes');

module.exports = {
  addKycDocument: Kyc.addKycDocument,
  addPhotos: Kyc.addPhotos,
  updateKycDocument: Kyc.updateKycDocument,
  hasValidDocument: Kyc.hasValidDocument,
  apiRoutes: {
    uploadDocumentHandler: apiRoutes.uploadDocumentHandler,
    createDocumentHandler: apiRoutes.createDocumentHandler,
    identifyHandler: apiRoutes.identifyHandler,
  },
  routes: {
    getKycDocumentHandler: routes.get,
    getKycDocumentsHandler: routes.getAll,
    createKycDocumentsHandler: routes.create,
    createKycContentDocumentHandler: routes.createContentDocument,
    verifyKycDocumentsHandler: routes.verify,
    declineKycDocumentsHandler: routes.decline,
    updateKycDocumentHandler: routes.update,
    updateKycDocumentPhotoHandler: routes.updatePhoto,
    createKycDocumentRequestHandler: routes.createDocumentRequest,
    getKycDocumentRequestsHandler: routes.getRequests,
  },
};
