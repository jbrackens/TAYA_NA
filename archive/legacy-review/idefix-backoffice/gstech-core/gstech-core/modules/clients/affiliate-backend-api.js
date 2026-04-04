/* @flow */
const config = require('../config');
const request = require('../request')('affiliate-backend-api', config.api.affmoreServer.private);

export type GetAffiliatesResponse = {| // TODO: duplicate! this type definition must move to core at some point
  affiliates: {|
    affiliateId: Id,
    affiliateName: string,
  |}[],
|};

const getAffiliates = async (): Promise<DataResponse<GetAffiliatesResponse>> =>
  request('GET', '/affiliates');

module.exports = {
  getAffiliates,
};
