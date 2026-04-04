/* @flow */
const rewardserverClient = require('gstech-core/modules/clients/rewardserver-api');

describe('Shop API', () => {
  let session;
  before(async () => {
    session = await setup.player({ languageISO: 'fi', lang: 'fi' });
    let playerId = 0;
    await session.get('/api/test/details').expect(200).expect((res) => { playerId = Number(res.body.ClientID) });
    const rewards = await rewardserverClient.getAvailableRewards('KK', { rewardType: 'markka' });
    await rewardserverClient.creditReward('KK', rewards[0].reward.id, { playerId, count: 100, source: 'marketing' });
  });

  it('fetches initial shop state', async () =>
    session
      .get('/api/shop')
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({
          shop: {
            version: 2,
            items: [],
            categories: [
            ],
          },
          update: {
            details: {
              shopBalance: {
                balance: 100,
                progress: 50,
                target: 5,
                theme: 'default',
              },
            }
          }
        })
      })
  );

  it('buys lootbox item', async () => {
    const rewards = await rewardserverClient.getAvailableRewards('KK', { rewardType: 'shopItemV2' });
    const r = rewards.filter(r => r.reward.creditType === 'lootBox' && r.reward.externalId === 'KKLootBox_10')
    await session
      .post(`/api/shop/lootbox/${r[0].reward.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({
          items: [],
        })
      })
    });

  it('has lootbox prices in items', async () => {
    await session
      .get('/api/shop')
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({
          shop: {
            items: [
              {
                type: 'freespins',
              }
            ],
          },
          update: {
            details: {
              shopBalance: {
                balance: 90,
                progress: 50,
                target: 5,
                theme: 'default',
              }
            }
          }
        })
      })
    });
});
