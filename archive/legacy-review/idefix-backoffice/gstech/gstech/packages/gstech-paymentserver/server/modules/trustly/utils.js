/* @flow */

const mapPersonId = (personid: string): ?string => {
  if (personid != null) {
    if (personid.indexOf('FI') === 0) {
      return personid.substring(2);
    }
  }
  return personid;
};

module.exports = {
  mapPersonId,
}