/* @flow */
const { Router } = require('express');

const {
  createAdminFeeHandler,
  getAdminFeesHandler,
  getAdminFeeHandler,
  updateAdminFeeHandler,
  deleteAdminFeeHandler,
} = require('./routes');

const router: express$Router<> = Router();

router.post('/', createAdminFeeHandler);
router.get('/', getAdminFeesHandler);
router.get('/:adminFeeId', getAdminFeeHandler);
router.put('/:adminFeeId', updateAdminFeeHandler);
router.delete('/:adminFeeId', deleteAdminFeeHandler);

module.exports = router;
