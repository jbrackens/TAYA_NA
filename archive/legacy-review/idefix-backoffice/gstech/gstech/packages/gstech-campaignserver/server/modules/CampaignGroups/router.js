/* @flow */
const { Router } = require('express');

const pg = require('gstech-core/modules/pg');

const routes = require('./routes');
const { getGroup } = require('./repository');

const router: express$Router<> = Router();  

router.param('groupId', async (req: any, res, next, param) => {
  const groupId = Number(param);

  try {
    const group = await getGroup(pg, groupId);
    if (group) {
      req.campaignGroup = group;
      next();
    } else {
      res.status(404).json({ error: { message: `Group ${groupId} not found` } });
    }
  } catch (e) {
    res.status(400).json({ error: { message: 'Invalid groupId parameter' } });
  }
});

router.put('/:groupId', routes.updateGroupName);
router.delete('/:groupId', routes.archiveGroup);
router.post('/:groupId/duplicate', routes.duplicateGroup);

module.exports = router;
