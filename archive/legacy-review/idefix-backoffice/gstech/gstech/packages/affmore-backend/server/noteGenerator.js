/* @flow */
const pg = require('gstech-core/modules/pg');
const linksRepository = require('./modules/admin/affiliates/links/repository');
const plansRepository = require('./modules/admin/plans/repository');

const generateDifferenceNote = async (keyObject: Object, oldObject: Object, newObject: Object): Promise<string> => {
  const notes = await Promise.all(Object.keys(keyObject).map(async key => {
    let oldValue = JSON.stringify(oldObject[key]) || '';
    let newValue = JSON.stringify(newObject[key]) || '';
    let fieldName = key;

    if (oldValue === newValue) return '';

    if (key === 'linkId') {
      const oldLink = await linksRepository.getAffiliateLinkById(pg, Number(oldValue));
      const newLink = await linksRepository.getAffiliateLinkById(pg, Number(newValue));
      oldValue = oldLink ? oldLink.name : oldValue;
      newValue = newLink ? newLink.name : newValue;
      fieldName = 'Link';
    } else if (key === 'planId') {
      const oldPlan = await plansRepository.getPlan(pg, Number(oldValue));
      const newPlan = await plansRepository.getPlan(pg, Number(newValue));
      oldValue = oldPlan ? oldPlan.name : oldValue;
      newValue = newPlan ? newPlan.name : newValue;
      fieldName = 'Plan';
    }

    return `'${fieldName}' changed from '${oldValue}' to '${newValue}'`;
  }));

  const note = notes.filter(x => x).join('\n');

  return note;
};

module.exports = {
  generateDifferenceNote,
};
