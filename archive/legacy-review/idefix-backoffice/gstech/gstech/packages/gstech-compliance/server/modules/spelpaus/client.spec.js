/* @flow */
const client = require('./client');
require('./client.nock');

describe('Spelpaus API', () => {
  it('can postBlockingInfo with blocked subjectId', async () => {
    const response = await client.postBlockingInfo('182701303378');
    expect(response).to.deep.equal({
      subjectId: '182701303378',
      isBlocked: true,
    });
  });

  it('can postBlockingInfo with not blocked subjectId', async () => {
    const response = await client.postBlockingInfo('182701303377');
    expect(response).to.deep.equal({
      subjectId: '182701303377',
      isBlocked: false,
    });
  });

  it('can postBlockingInfo with wrong subjectId', async () => {
    await expect(() => client.postBlockingInfo('1827')).to.be.rejected;
  });

  it('can postBlockingInfo with another wrong subjectId', async () => {
    await expect(() => client.postBlockingInfo('182701303377423')).to.be.rejected;
  });

  it('can postMarketingSingleSubjectId with blocked subjectId', async () => {
    const response = await client.postMarketingSingleSubjectId('182701303378');
    expect(response).to.deep.equal({
      subjectId: '182701303378',
      isBlocked: true,
    });
  });

  it('can postMarketingSingleSubjectId not blocked subjectId', async () => {
    const response = await client.postMarketingSingleSubjectId('182701303377');
    expect(response).to.deep.equal({
      subjectId: '182701303377',
      isBlocked: false,
    });
  });

  it('can postMarketingSingleSubjectId with wrong subjectId', async () => {
    await expect(() => client.postMarketingSingleSubjectId('1827')).to.be.rejected;
  });

  it('can postMarketingSubjectId', async () => {
    const response = await client.postMarketingSubjectId(['182701303378', '182701303377']);
    expect(response).to.deep.equal([{
      subjectId: '182701303378',
      isBlocked: true,
    }, {
      subjectId: '182701303377',
      isBlocked: false,
    }]);
  });

  it('can postMarketingSubjectId with wrong subjectIds', async () => {
    await expect(() => client.postMarketingSubjectId(['182701303', '78903849944432423'])).to.be.rejected;
  });

  it('can postMarketingSubjectId with wrong partially subjectIds', async () => {
    await expect(() => client.postMarketingSubjectId(['182701303378', '1234'])).to.be.rejected;
  });
});
