/* @flow */
const request = require('supertest');  
const { v1: uuid } = require('uuid');

const api = require('gstech-core/modules/clients/backend-payment-api');
const { encrypt } = require('gstech-core/modules/miserypt');

const app = require('../../index');
const config = require('../../../config');

describe('Trustly Callback API', () => {
  describe('Successful Deposit', () => {
    let sessionId;
    let transactionKey;
    let player;

    const transactionId = uuid();
    before(async () => {
      await request(config.api.backend.url)
        .post('/api/v1/test/init-session')
        .send({
          manufacturer: 'NE',
          initialBalance: 1000,
        })
        .expect((res) => {
          sessionId = res.body.token;
          player = res.body.player;
        })
        .expect(200);

      await request(config.api.backend.url)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'Trustly_Trustly', amount: 50000, bonusId: 1001 })
        .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        });
    });

    it('can handle account callback', async () =>
      request(app)
        .post('/api/v1/trustly/process/deposit/LD/standard')
        .send({
          params: {
            signature: 'LM3GdnjmfHMHsKH/9wtEUXSq0UYTioEh6LXRr5E69SkPKad8xsK5Nt+6Wu1EMG9scvG/j7bYH3AuPn+Fs5KrW8Wbpmj/2Bh8xMdw4hg/CKT4G5N/p3iJkMYGVk/J6Q450J/fgC7X40WRmoCrlVsgIa1vcwSxzH6AjrhWahRIFqsUTt0iMuBCm/rItbFIW4POYXmwGPi0+BvgtpwvGfiEq9fmf65i4MRFx5wiULLRbD50WnO4lgNFVYQd45smMQjc+PypTxcBXZGgU9djEmaYbaNC1iECZLf8/XmwjLHAngtaR6w75Mv9pM6lYvk8It7UkOnFt9bieuBCzapQtygzgw==',
            data: {
              notificationid: '3530755744',
              attributes: {
                clearinghouse: 'FINLAND',
                address: 'Koskikatu 65',
                lastdigits: '000072',
                zipcode: '02270',
                personid: 'FI210748-7172',
                name: 'Pontus Penttinen',
                descriptor: '************000072',
                bank: 'Nordea',
                city: 'Espoo',
              },
              messageid: transactionKey,
              accountid: '3786320543',
              orderid: transactionId,
              verified: '1',
            },
            uuid: '7e325781-92b1-4573-b460-e4a5226473ff',
          },
          method: 'account',
          version: '1.1',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            result: {
              signature: 'BVkseQwHSloIlFfBiwHMtkHx1kiBVpjbKA9gkTDiYZXydVcWL4kcLfsHunXr4I3LDkneUbMPtnfE3eRZJh7li3xX2NxUyuo0zsFBp/JvAKP5B5Pn0FTkK3pYAsqk5bkv4W+yEyBLST9TZCh75bARmJ9spayoW6vQXYAvmfWvlAUrOhNVj8oNc+7kzvfY41+s9F0Fx1sUyf5RJuamgEm3Y3zj/xhKqIDAHupuHPMLKXcwvlrVN8K2yIL3J8G5nXa9rPFIkWqwv//cVH7MVL2BrV1oEdF0a5cmDVndlw44coI5a0PQozY0i0qiFQHgH1AjhNaDxs2gHjRb8ubh9JNDfw==',
              uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
              method: 'account',
              data: { status: 'OK' },
            },
            version: '1.1',
          });
        }));

    it('can handle pending callback', async () =>
      request(app)
        .post('/api/v1/trustly/process/deposit/LD/standard')
        .send({
          params: {
            data: {
              messageid: transactionKey,
              notificationid: '3607844765',
              currency: 'EUR',
              amount: '194.00',
              orderid: transactionId,
              enduserid: player.username,
              timestamp: '2019-03-19 20:06:56.718082+01',
            },
            uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
            signature: 'hFvk7aflvnM57wwiq1bkkIbFM09yTVPwLxlwD7hDZ8aoXYKtSFSkFRFSHCqzdqs4ZKAFC2y8IVL5MKIre9ctL6GSPbY5pwSQNxjqc/emglIp0vcYJi+LsK9gBVS5XiogxBq7+3KIMgLgnUbpNSp/Nf0Dct1bGibklOA7URZkYR8Tuzmk6VxzKg2hpFhAW1fsKHSD3sLaCQNFgmdwFNRB0ItW03qlytNnoI7FfhTHZIbcSD6DykTAcGzIopPEn1S9okyX23QJ0ZK8spDUAR911AhyzwXXgHuhccZZ398uqrX7av5kvsa7G7LWx/E3H7jaoaPmR1VYOpguaboisucd/A==',
          },
          method: 'pending',
          version: '1.1',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            result: {
              signature: 'BVkseQwHSloIlFfBiwHMtkHx1kiBVpjbKA9gkTDiYZXydVcWL4kcLfsHunXr4I3LDkneUbMPtnfE3eRZJh7li3xX2NxUyuo0zsFBp/JvAKP5B5Pn0FTkK3pYAsqk5bkv4W+yEyBLST9TZCh75bARmJ9spayoW6vQXYAvmfWvlAUrOhNVj8oNc+7kzvfY41+s9F0Fx1sUyf5RJuamgEm3Y3zj/xhKqIDAHupuHPMLKXcwvlrVN8K2yIL3J8G5nXa9rPFIkWqwv//cVH7MVL2BrV1oEdF0a5cmDVndlw44coI5a0PQozY0i0qiFQHgH1AjhNaDxs2gHjRb8ubh9JNDfw==',
              uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
              method: 'pending',
              data: { status: 'OK' },
            },
            version: '1.1',
          });
        }));

    it('can handle credit callback', async () =>
      request(app)
        .post('/api/v1/trustly/process/deposit/LD/standard')
        .send({
          params: {
            data: {
              amount: '194.00',
              enduserid: player.username,
              timestamp: '2019-03-19 20:06:56.718082+01',
              messageid: transactionKey,
              orderid: transactionId,
              notificationid: '2909966103',
              currency: 'EUR',
            },
            uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
            signature: 'hFvk7aflvnM57wwiq1bkkIbFM09yTVPwLxlwD7hDZ8aoXYKtSFSkFRFSHCqzdqs4ZKAFC2y8IVL5MKIre9ctL6GSPbY5pwSQNxjqc/emglIp0vcYJi+LsK9gBVS5XiogxBq7+3KIMgLgnUbpNSp/Nf0Dct1bGibklOA7URZkYR8Tuzmk6VxzKg2hpFhAW1fsKHSD3sLaCQNFgmdwFNRB0ItW03qlytNnoI7FfhTHZIbcSD6DykTAcGzIopPEn1S9okyX23QJ0ZK8spDUAR911AhyzwXXgHuhccZZ398uqrX7av5kvsa7G7LWx/E3H7jaoaPmR1VYOpguaboisucd/A==',
          },
          method: 'credit',
          version: '1.1',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            result: {
              signature: 'BVkseQwHSloIlFfBiwHMtkHx1kiBVpjbKA9gkTDiYZXydVcWL4kcLfsHunXr4I3LDkneUbMPtnfE3eRZJh7li3xX2NxUyuo0zsFBp/JvAKP5B5Pn0FTkK3pYAsqk5bkv4W+yEyBLST9TZCh75bARmJ9spayoW6vQXYAvmfWvlAUrOhNVj8oNc+7kzvfY41+s9F0Fx1sUyf5RJuamgEm3Y3zj/xhKqIDAHupuHPMLKXcwvlrVN8K2yIL3J8G5nXa9rPFIkWqwv//cVH7MVL2BrV1oEdF0a5cmDVndlw44coI5a0PQozY0i0qiFQHgH1AjhNaDxs2gHjRb8ubh9JNDfw==',
              uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
              method: 'credit',
              data: { status: 'OK' },
            },
            version: '1.1',
          });
        }));

    it('ignores pending callback after credit', async () =>
      request(app)
        .post('/api/v1/trustly/process/deposit/LD/standard')
        .send({
          params: {
            data: {
              messageid: transactionKey,
              notificationid: '3607844765',
              currency: 'EUR',
              amount: '194.00',
              orderid: transactionId,
              enduserid: player.username,
              timestamp: '2019-03-19 20:06:56.718082+01',
            },
            uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
            signature: 'hFvk7aflvnM57wwiq1bkkIbFM09yTVPwLxlwD7hDZ8aoXYKtSFSkFRFSHCqzdqs4ZKAFC2y8IVL5MKIre9ctL6GSPbY5pwSQNxjqc/emglIp0vcYJi+LsK9gBVS5XiogxBq7+3KIMgLgnUbpNSp/Nf0Dct1bGibklOA7URZkYR8Tuzmk6VxzKg2hpFhAW1fsKHSD3sLaCQNFgmdwFNRB0ItW03qlytNnoI7FfhTHZIbcSD6DykTAcGzIopPEn1S9okyX23QJ0ZK8spDUAR911AhyzwXXgHuhccZZ398uqrX7av5kvsa7G7LWx/E3H7jaoaPmR1VYOpguaboisucd/A==',
          },
          method: 'pending',
          version: '1.1',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            result: {
              signature: 'BVkseQwHSloIlFfBiwHMtkHx1kiBVpjbKA9gkTDiYZXydVcWL4kcLfsHunXr4I3LDkneUbMPtnfE3eRZJh7li3xX2NxUyuo0zsFBp/JvAKP5B5Pn0FTkK3pYAsqk5bkv4W+yEyBLST9TZCh75bARmJ9spayoW6vQXYAvmfWvlAUrOhNVj8oNc+7kzvfY41+s9F0Fx1sUyf5RJuamgEm3Y3zj/xhKqIDAHupuHPMLKXcwvlrVN8K2yIL3J8G5nXa9rPFIkWqwv//cVH7MVL2BrV1oEdF0a5cmDVndlw44coI5a0PQozY0i0qiFQHgH1AjhNaDxs2gHjRb8ubh9JNDfw==',
              uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
              method: 'pending',
              data: { status: 'OK' },
            },
            version: '1.1',
          });
        }));

    // it('can handle kyc callback', async () => // TODO: UNCOMMENT WHEN KYC PROCESS WORK
    //   request(app)
    //     .post('/api/v1/trustly/process/deposit/LD/standard')
    //     .send({
    //       params: {
    //         data: {
    //           notificationid: '4132571197',
    //           attributes: {
    //             street: 'Sulkuvartijankatu 75',
    //             country: 'Finland',
    //             zipcode: '55100',
    //             firstname: 'Nea',
    //             personid: 'FI131149-566K',
    //             lastname: 'Salmela',
    //             city: 'Imatra',
    //             gender: 'F',
    //             dob: '1949-11-13',
    //           },
    //           orderid: '2921889259',
    //           kycentityid: 'ae74ee67-fac1-4c08-9174-7a866587f0f8',
    //           messageid: '78814e50-5b67-11e9-a6da-d7f8df2d43b4',
    //         },
    //         signature: 'jag2PnpPHEXzxJAPsbbUl6CRg4FSgpH/7L2YttVTY2iASoPfYLDAInOa+kK73u+mIbh1XELqgUFzBhAu9F+sg+3xpOY1fH98ceviNmwh0VXrzJzhpAiwgWY/YMrbbp54gjSup3itQFWV6nNRwyq36j67rW+V8AiHUXBRKwgFFka/ZGVDjzrvTlKZBEfm64hQ5ULk4U7L2XyTyHiG1kT+KU/AoXdqknOJUGC/Ut7lB9d8o7EtS+9dWhhlRXxXo6XuXZuQ2g7fh9QevxlF9omDooJDd3l40Oo04VVu8t7fn84aRBYxfPuB5LDoKYYLHts3/I/u0KkXfbg+ERSR0xYEiw==',
    //         uuid: '38e82d06-cc7c-4115-9c48-297d7869e0c9',
    //       },
    //       method: 'kyc',
    //       version: '1.1',
    //     })
    //     .expect(200)
    //     .expect((res) => {
    //       expect(res.body).to.deep.equal({
    //         result: {
    //           signature: 'BVkseQwHSloIlFfBiwHMtkHx1kiBVpjbKA9gkTDiYZXydVcWL4kcLfsHunXr4I3LDkneUbMPtnfE3eRZJh7li3xX2NxUyuo0zsFBp/JvAKP5B5Pn0FTkK3pYAsqk5bkv4W+yEyBLST9TZCh75bARmJ9spayoW6vQXYAvmfWvlAUrOhNVj8oNc+7kzvfY41+s9F0Fx1sUyf5RJuamgEm3Y3zj/xhKqIDAHupuHPMLKXcwvlrVN8K2yIL3J8G5nXa9rPFIkWqwv//cVH7MVL2BrV1oEdF0a5cmDVndlw44coI5a0PQozY0i0qiFQHgH1AjhNaDxs2gHjRb8ubh9JNDfw==',
    //           uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
    //           method: 'kyc',
    //           data: { status: 'CONTINUE' },
    //         },
    //         version: '1.1',
    //       });
    //     }));

    it('can fail kyc callback', async () =>
      request(app)
        .post('/api/v1/trustly/process/deposit/LD/standard')
        .send({
          params: {
            data: {
              notificationid: '4132571197',
              abort: '1',
              abortmessage: 'underage',
              attributes: {
                street: 'Sulkuvartijankatu 75',
                country: 'Finland',
                zipcode: '55100',
                firstname: 'Nea',
                personid: 'FI131149-566K',
                lastname: 'Salmela',
                city: 'Imatra',
                gender: 'F',
                dob: '1949-11-13',
              },
              orderid: '2921889259',
              kycentityid: 'ae74ee67-fac1-4c08-9174-7a866587f0f8',
              messageid: '78814e50-5b67-11e9-a6da-d7f8df2d43b4',
            },
            signature: 'jag2PnpPHEXzxJAPsbbUl6CRg4FSgpH/7L2YttVTY2iASoPfYLDAInOa+kK73u+mIbh1XELqgUFzBhAu9F+sg+3xpOY1fH98ceviNmwh0VXrzJzhpAiwgWY/YMrbbp54gjSup3itQFWV6nNRwyq36j67rW+V8AiHUXBRKwgFFka/ZGVDjzrvTlKZBEfm64hQ5ULk4U7L2XyTyHiG1kT+KU/AoXdqknOJUGC/Ut7lB9d8o7EtS+9dWhhlRXxXo6XuXZuQ2g7fh9QevxlF9omDooJDd3l40Oo04VVu8t7fn84aRBYxfPuB5LDoKYYLHts3/I/u0KkXfbg+ERSR0xYEiw==',
            uuid: '38e82d06-cc7c-4115-9c48-297d7869e0c9',
          },
          method: 'kyc',
          version: '1.1',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            result: {
              data: {
                status: 'CONTINUE',
              },
              method: 'kyc',
              signature: 'BVkseQwHSloIlFfBiwHMtkHx1kiBVpjbKA9gkTDiYZXydVcWL4kcLfsHunXr4I3LDkneUbMPtnfE3eRZJh7li3xX2NxUyuo0zsFBp/JvAKP5B5Pn0FTkK3pYAsqk5bkv4W+yEyBLST9TZCh75bARmJ9spayoW6vQXYAvmfWvlAUrOhNVj8oNc+7kzvfY41+s9F0Fx1sUyf5RJuamgEm3Y3zj/xhKqIDAHupuHPMLKXcwvlrVN8K2yIL3J8G5nXa9rPFIkWqwv//cVH7MVL2BrV1oEdF0a5cmDVndlw44coI5a0PQozY0i0qiFQHgH1AjhNaDxs2gHjRb8ubh9JNDfw==',
              uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
            },
            version: '1.1',
          });
        }));
  });

  describe('Successful Deposit with notifications in reverse order', () => {
    let sessionId;
    let transactionKey;
    let player;

    const transactionId = uuid();
    before(async () => {
      await request(config.api.backend.url)
        .post('/api/v1/test/init-session')
        .send({
          manufacturer: 'NE',
          initialBalance: 1000,
        })
        .expect((res) => {
          sessionId = res.body.token;
          player = res.body.player;
        })
        .expect(200);

      await request(config.api.backend.url)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'Trustly_Trustly', amount: 50000, bonusId: 1001 })
        .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        });
    });

    it('can handle credit callback', async () =>
      request(app)
        .post('/api/v1/trustly/process/deposit/LD/standard')
        .send({
          params: {
            data: {
              amount: '194.00',
              enduserid: player.username,
              timestamp: '2019-03-19 20:06:56.718082+01',
              messageid: transactionKey,
              orderid: transactionId,
              notificationid: '2909966103',
              currency: 'EUR',
            },
            uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
            signature: 'hFvk7aflvnM57wwiq1bkkIbFM09yTVPwLxlwD7hDZ8aoXYKtSFSkFRFSHCqzdqs4ZKAFC2y8IVL5MKIre9ctL6GSPbY5pwSQNxjqc/emglIp0vcYJi+LsK9gBVS5XiogxBq7+3KIMgLgnUbpNSp/Nf0Dct1bGibklOA7URZkYR8Tuzmk6VxzKg2hpFhAW1fsKHSD3sLaCQNFgmdwFNRB0ItW03qlytNnoI7FfhTHZIbcSD6DykTAcGzIopPEn1S9okyX23QJ0ZK8spDUAR911AhyzwXXgHuhccZZ398uqrX7av5kvsa7G7LWx/E3H7jaoaPmR1VYOpguaboisucd/A==',
          },
          method: 'credit',
          version: '1.1',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            result: {
              signature: 'BVkseQwHSloIlFfBiwHMtkHx1kiBVpjbKA9gkTDiYZXydVcWL4kcLfsHunXr4I3LDkneUbMPtnfE3eRZJh7li3xX2NxUyuo0zsFBp/JvAKP5B5Pn0FTkK3pYAsqk5bkv4W+yEyBLST9TZCh75bARmJ9spayoW6vQXYAvmfWvlAUrOhNVj8oNc+7kzvfY41+s9F0Fx1sUyf5RJuamgEm3Y3zj/xhKqIDAHupuHPMLKXcwvlrVN8K2yIL3J8G5nXa9rPFIkWqwv//cVH7MVL2BrV1oEdF0a5cmDVndlw44coI5a0PQozY0i0qiFQHgH1AjhNaDxs2gHjRb8ubh9JNDfw==',
              uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
              method: 'credit',
              data: { status: 'OK' },
            },
            version: '1.1',
          });
        }));


    it('can handle account callback', async () =>
      request(app)
        .post('/api/v1/trustly/process/deposit/LD/standard')
        .send({
          params: {
            signature: 'LM3GdnjmfHMHsKH/9wtEUXSq0UYTioEh6LXRr5E69SkPKad8xsK5Nt+6Wu1EMG9scvG/j7bYH3AuPn+Fs5KrW8Wbpmj/2Bh8xMdw4hg/CKT4G5N/p3iJkMYGVk/J6Q450J/fgC7X40WRmoCrlVsgIa1vcwSxzH6AjrhWahRIFqsUTt0iMuBCm/rItbFIW4POYXmwGPi0+BvgtpwvGfiEq9fmf65i4MRFx5wiULLRbD50WnO4lgNFVYQd45smMQjc+PypTxcBXZGgU9djEmaYbaNC1iECZLf8/XmwjLHAngtaR6w75Mv9pM6lYvk8It7UkOnFt9bieuBCzapQtygzgw==',
            data: {
              notificationid: '3530755744',
              attributes: {
                clearinghouse: 'FINLAND',
                address: 'Koskikatu 65',
                lastdigits: '000072',
                zipcode: '02270',
                personid: 'FI210748-7172',
                name: 'Pontus Penttinen',
                descriptor: '************000072',
                bank: 'Nordea',
                city: 'Espoo',
              },
              messageid: transactionKey,
              accountid: '3786320543',
              orderid: transactionId,
              verified: '1',
            },
            uuid: '7e325781-92b1-4573-b460-e4a5226473ff',
          },
          method: 'account',
          version: '1.1',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            result: {
              signature: 'BVkseQwHSloIlFfBiwHMtkHx1kiBVpjbKA9gkTDiYZXydVcWL4kcLfsHunXr4I3LDkneUbMPtnfE3eRZJh7li3xX2NxUyuo0zsFBp/JvAKP5B5Pn0FTkK3pYAsqk5bkv4W+yEyBLST9TZCh75bARmJ9spayoW6vQXYAvmfWvlAUrOhNVj8oNc+7kzvfY41+s9F0Fx1sUyf5RJuamgEm3Y3zj/xhKqIDAHupuHPMLKXcwvlrVN8K2yIL3J8G5nXa9rPFIkWqwv//cVH7MVL2BrV1oEdF0a5cmDVndlw44coI5a0PQozY0i0qiFQHgH1AjhNaDxs2gHjRb8ubh9JNDfw==',
              uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
              method: 'account',
              data: { status: 'OK' },
            },
            version: '1.1',
          });
        }));
  });

  describe('Failing Deposit', () => {
    let sessionId;
    let transactionKey;

    const transactionId = uuid();
    before(async () => {
      await request(config.api.backend.url)
        .post('/api/v1/test/init-session')
        .send({
          manufacturer: 'NE',
          initialBalance: 1000,
        })
        .expect((res) => {
          sessionId = res.body.token;
        })
        .expect(200);

      await request(config.api.backend.url)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'Trustly_Trustly', amount: 50000, bonusId: 1001 })
        .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        });
    });

    it('can handle account callback', async () =>
      request(app)
        .post('/api/v1/trustly/process/deposit/LD/standard')
        .send({
          params: {
            signature: 'LM3GdnjmfHMHsKH/9wtEUXSq0UYTioEh6LXRr5E69SkPKad8xsK5Nt+6Wu1EMG9scvG/j7bYH3AuPn+Fs5KrW8Wbpmj/2Bh8xMdw4hg/CKT4G5N/p3iJkMYGVk/J6Q450J/fgC7X40WRmoCrlVsgIa1vcwSxzH6AjrhWahRIFqsUTt0iMuBCm/rItbFIW4POYXmwGPi0+BvgtpwvGfiEq9fmf65i4MRFx5wiULLRbD50WnO4lgNFVYQd45smMQjc+PypTxcBXZGgU9djEmaYbaNC1iECZLf8/XmwjLHAngtaR6w75Mv9pM6lYvk8It7UkOnFt9bieuBCzapQtygzgw==',
            data: {
              notificationid: '3530755744',
              attributes: {
                clearinghouse: 'FINLAND',
                address: 'Koskikatu 65',
                lastdigits: '000072',
                zipcode: '02270',
                personid: 'FI210748-7172',
                name: 'Pontus Penttinen',
                descriptor: '************000072',
                bank: 'Nordea',
                city: 'Espoo',
              },
              messageid: transactionKey,
              accountid: '3786320543',
              orderid: transactionId,
              verified: '1',
            },
            uuid: '7e325781-92b1-4573-b460-e4a5226473ff',
          },
          method: 'account',
          version: '1.1',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            result: {
              signature: 'BVkseQwHSloIlFfBiwHMtkHx1kiBVpjbKA9gkTDiYZXydVcWL4kcLfsHunXr4I3LDkneUbMPtnfE3eRZJh7li3xX2NxUyuo0zsFBp/JvAKP5B5Pn0FTkK3pYAsqk5bkv4W+yEyBLST9TZCh75bARmJ9spayoW6vQXYAvmfWvlAUrOhNVj8oNc+7kzvfY41+s9F0Fx1sUyf5RJuamgEm3Y3zj/xhKqIDAHupuHPMLKXcwvlrVN8K2yIL3J8G5nXa9rPFIkWqwv//cVH7MVL2BrV1oEdF0a5cmDVndlw44coI5a0PQozY0i0qiFQHgH1AjhNaDxs2gHjRb8ubh9JNDfw==',
              uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
              method: 'account',
              data: { status: 'OK' },
            },
            version: '1.1',
          });
        }));

    it('can handle debit (fail) callback', async () =>
      request(app)
        .post('/api/v1/trustly/process/deposit/LD/standard')
        .send({
          params: {
            data: {
              messageid: transactionKey,
              notificationid: '3607844765',
              currency: 'EUR',
              amount: '194.00',
              orderid: transactionId,
              enduserid: 'LD_Test.User_123',
              timestamp: '2 019-03-19 20:06:56.718082+01',
            },
            uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
            signature: 'hFvk7aflvnM57wwiq1bkkIbFM09yTVPwLxlwD7hDZ8aoXYKtSFSkFRFSHCqzdqs4ZKAFC2y8IVL5MKIre9ctL6GSPbY5pwSQNxjqc/emglIp0vcYJi+LsK9gBVS5XiogxBq7+3KIMgLgnUbpNSp/Nf0Dct1bGibklOA7URZkYR8Tuzmk6VxzKg2hpFhAW1fsKHSD3sLaCQNFgmdwFNRB0ItW03qlytNnoI7FfhTHZIbcSD6DykTAcGzIopPEn1S9okyX23QJ0ZK8spDUAR911AhyzwXXgHuhccZZ398uqrX7av5kvsa7G7LWx/E3H7jaoaPmR1VYOpguaboisucd/A==',
          },
          method: 'debit',
          version: '1.1',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            result: {
              signature: 'BVkseQwHSloIlFfBiwHMtkHx1kiBVpjbKA9gkTDiYZXydVcWL4kcLfsHunXr4I3LDkneUbMPtnfE3eRZJh7li3xX2NxUyuo0zsFBp/JvAKP5B5Pn0FTkK3pYAsqk5bkv4W+yEyBLST9TZCh75bARmJ9spayoW6vQXYAvmfWvlAUrOhNVj8oNc+7kzvfY41+s9F0Fx1sUyf5RJuamgEm3Y3zj/xhKqIDAHupuHPMLKXcwvlrVN8K2yIL3J8G5nXa9rPFIkWqwv//cVH7MVL2BrV1oEdF0a5cmDVndlw44coI5a0PQozY0i0qiFQHgH1AjhNaDxs2gHjRb8ubh9JNDfw==',
              uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
              method: 'debit',
              data: { status: 'OK' },
            },
            version: '1.1',
          });
        }));
  });

  describe('Canceling Deposit', () => {
    let sessionId;
    let transactionKey;

    const transactionId = uuid();
    before(async () => {
      await request(config.api.backend.url)
        .post('/api/v1/test/init-session')
        .send({
          manufacturer: 'NE',
          initialBalance: 1000,
        })
        .expect((res) => {
          sessionId = res.body.token;
        })
        .expect(200);

      await request(config.api.backend.url)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'Trustly_Trustly', amount: 50000, bonusId: 1001 })
        .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
        .expect(200)
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        });
    });

    it('can handle account callback', async () =>
      request(app)
        .post('/api/v1/trustly/process/deposit/LD/standard')
        .send({
          params: {
            signature: 'LM3GdnjmfHMHsKH/9wtEUXSq0UYTioEh6LXRr5E69SkPKad8xsK5Nt+6Wu1EMG9scvG/j7bYH3AuPn+Fs5KrW8Wbpmj/2Bh8xMdw4hg/CKT4G5N/p3iJkMYGVk/J6Q450J/fgC7X40WRmoCrlVsgIa1vcwSxzH6AjrhWahRIFqsUTt0iMuBCm/rItbFIW4POYXmwGPi0+BvgtpwvGfiEq9fmf65i4MRFx5wiULLRbD50WnO4lgNFVYQd45smMQjc+PypTxcBXZGgU9djEmaYbaNC1iECZLf8/XmwjLHAngtaR6w75Mv9pM6lYvk8It7UkOnFt9bieuBCzapQtygzgw==',
            data: {
              notificationid: '3530755744',
              attributes: {
                clearinghouse: 'FINLAND',
                address: 'Koskikatu 65',
                lastdigits: '000072',
                zipcode: '02270',
                personid: 'FI210748-7172',
                name: 'Pontus Penttinen',
                descriptor: '************000072',
                bank: 'Nordea',
                city: 'Espoo',
              },
              messageid: transactionKey,
              accountid: '3786320543',
              orderid: transactionId,
              verified: '1',
            },
            uuid: '7e325781-92b1-4573-b460-e4a5226473ff',
          },
          method: 'account',
          version: '1.1',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            result: {
              signature: 'BVkseQwHSloIlFfBiwHMtkHx1kiBVpjbKA9gkTDiYZXydVcWL4kcLfsHunXr4I3LDkneUbMPtnfE3eRZJh7li3xX2NxUyuo0zsFBp/JvAKP5B5Pn0FTkK3pYAsqk5bkv4W+yEyBLST9TZCh75bARmJ9spayoW6vQXYAvmfWvlAUrOhNVj8oNc+7kzvfY41+s9F0Fx1sUyf5RJuamgEm3Y3zj/xhKqIDAHupuHPMLKXcwvlrVN8K2yIL3J8G5nXa9rPFIkWqwv//cVH7MVL2BrV1oEdF0a5cmDVndlw44coI5a0PQozY0i0qiFQHgH1AjhNaDxs2gHjRb8ubh9JNDfw==',
              uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
              method: 'account',
              data: { status: 'OK' },
            },
            version: '1.1',
          });
        }));

    it('can handle cancel callback', async () =>
      request(app)
        .post('/api/v1/trustly/process/deposit/LD/standard')
        .send({
          params: {
            data: {
              messageid: transactionKey,
              notificationid: '3607844765',
              currency: 'EUR',
              amount: '194.00',
              orderid: transactionId,
              enduserid: 'LD_Test.User_123',
              timestamp: '2019-03-19 20:06:56.718082+01',
            },
            uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
            signature: 'hFvk7aflvnM57wwiq1bkkIbFM09yTVPwLxlwD7hDZ8aoXYKtSFSkFRFSHCqzdqs4ZKAFC2y8IVL5MKIre9ctL6GSPbY5pwSQNxjqc/emglIp0vcYJi+LsK9gBVS5XiogxBq7+3KIMgLgnUbpNSp/Nf0Dct1bGibklOA7URZkYR8Tuzmk6VxzKg2hpFhAW1fsKHSD3sLaCQNFgmdwFNRB0ItW03qlytNnoI7FfhTHZIbcSD6DykTAcGzIopPEn1S9okyX23QJ0ZK8spDUAR911AhyzwXXgHuhccZZ398uqrX7av5kvsa7G7LWx/E3H7jaoaPmR1VYOpguaboisucd/A==',
          },
          method: 'cancel',
          version: '1.1',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            result: {
              signature: 'BVkseQwHSloIlFfBiwHMtkHx1kiBVpjbKA9gkTDiYZXydVcWL4kcLfsHunXr4I3LDkneUbMPtnfE3eRZJh7li3xX2NxUyuo0zsFBp/JvAKP5B5Pn0FTkK3pYAsqk5bkv4W+yEyBLST9TZCh75bARmJ9spayoW6vQXYAvmfWvlAUrOhNVj8oNc+7kzvfY41+s9F0Fx1sUyf5RJuamgEm3Y3zj/xhKqIDAHupuHPMLKXcwvlrVN8K2yIL3J8G5nXa9rPFIkWqwv//cVH7MVL2BrV1oEdF0a5cmDVndlw44coI5a0PQozY0i0qiFQHgH1AjhNaDxs2gHjRb8ubh9JNDfw==',
              uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
              method: 'cancel',
              data: { status: 'OK' },
            },
            version: '1.1',
          });
        }));
  });

  describe('Failing Withdrawal', () => {
    let player;
    let sessionId;
    let transactionKey;

    before(async () => {
      await request(config.api.backend.url)
        .post('/api/v1/test/init-session')
        .send({
          manufacturer: 'NE',
          initialBalance: 1000,
        })
        .expect((res) => {
          player = res.body.player;
          sessionId = res.body.token;
        })
        .expect(200);

      await request(config.api.backend.url)
        .post('/api/LD/v1/deposit')
        .send({ depositMethod: 'Trustly_Trustly', amount: 50000, bonusId: 1001 })
        .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        })
        .expect(200);

      const updateDepositRequest = {
        account: '************000072',
        accountHolder: 'Pontus Penttinen',
        externalTransactionId: transactionKey,
        accountParameters: { trustlyAccountId: '3786320543', trustlyMode: 'bank' },
        message: 'Account',
        // $FlowFixMe[prop-missing]
        rawTransaction: request.params,
      };
      await api.updateDeposit(player.username, transactionKey, updateDepositRequest);
      await request(config.api.backend.url)
        .post('/api/LD/v1/test-withdraw')
        .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
        .send({
          amount: 500,
          provider: 'Trustly',
        })
        .expect((res) => {
          transactionKey = res.body.transactionKey;
        })
        .expect(200);
    });

    it('can handle credit (fail) callback', async () =>
      request(app)
        .post('/api/v1/trustly/process/payout/LD/standard')
        .send({
          params: {
            data: {
              amount: '902.50',
              currency: 'EUR',
              messageid: transactionKey,
              orderid: '87654567',
              enduserid: player.username,
              notificationid: '9876543456',
              timestamp: '2010-01-20 14:42:04.675645+01',
              attributes: {},
            },
            uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
            signature: 'hFvk7aflvnM57wwiq1bkkIbFM09yTVPwLxlwD7hDZ8aoXYKtSFSkFRFSHCqzdqs4ZKAFC2y8IVL5MKIre9ctL6GSPbY5pwSQNxjqc/emglIp0vcYJi+LsK9gBVS5XiogxBq7+3KIMgLgnUbpNSp/Nf0Dct1bGibklOA7URZkYR8Tuzmk6VxzKg2hpFhAW1fsKHSD3sLaCQNFgmdwFNRB0ItW03qlytNnoI7FfhTHZIbcSD6DykTAcGzIopPEn1S9okyX23QJ0ZK8spDUAR911AhyzwXXgHuhccZZ398uqrX7av5kvsa7G7LWx/E3H7jaoaPmR1VYOpguaboisucd/A==',
          },
          method: 'credit',
          version: '1.1',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            result: {
              signature: 'BVkseQwHSloIlFfBiwHMtkHx1kiBVpjbKA9gkTDiYZXydVcWL4kcLfsHunXr4I3LDkneUbMPtnfE3eRZJh7li3xX2NxUyuo0zsFBp/JvAKP5B5Pn0FTkK3pYAsqk5bkv4W+yEyBLST9TZCh75bARmJ9spayoW6vQXYAvmfWvlAUrOhNVj8oNc+7kzvfY41+s9F0Fx1sUyf5RJuamgEm3Y3zj/xhKqIDAHupuHPMLKXcwvlrVN8K2yIL3J8G5nXa9rPFIkWqwv//cVH7MVL2BrV1oEdF0a5cmDVndlw44coI5a0PQozY0i0qiFQHgH1AjhNaDxs2gHjRb8ubh9JNDfw==',
              uuid: '42db1a65-c80c-487a-a5c4-51330b540315',
              method: 'credit',
              data: { status: 'OK' },
            },
            version: '1.1',
          });
        }));
  });

  describe('Successful identification', () => {
    let player;

    before(async () => {
      await request(config.api.backend.url)
        .post('/api/v1/test/init-session')
        .send({
          manufacturer: 'NE',
          initialBalance: 1000,
        })
        .expect((res) => {
          player = res.body.player;
        })
        .expect(200);
    });

    it('can handle kyc callback', async () =>
      request(app)
        .post(`/api/v1/trustly/process/identify/${encodeURIComponent(encrypt(player.username, config.publicKey))}`)
        .send({
          method: "kyc",
          params: {
            data: {
              orderid: "15260465326",
              messageid: "53b46100-e604-11eb-b48e-bf4622a44a00",
              attributes: {
                dob: "1987-05-09",
                city: "Tampere",
                gender: "F",
                street: "Sahantie 21",
                country: "Finland",
                zipcode: "33100",
                lastname: "Koivuniemi",
                personid: "FI090587-511R",
                firstname: "Veera"
              },
              kycentityid: "dcf57e5d-47f0-43c9-bd09-e3604db84f18",
              notificationid: "14010774621"
            },
            uuid: "3c5eeab5-daa1-4a14-a054-fbc22ca71d94",
            signature: "bnT6xni2dqRE9fw+yNuxbvFx0nR9oSX1w26cUvmMljOv5yn1hLZiYVEJ5OpjpPM9nE66J689fqkLwVc+n7jiqkkoCegnf6k6YIwKlOEEOq+bnX/i4DEp5UC3aoESpGfb2UCMNBZ1NC4QbpmgTo/Uzqg7waZ92oItylAPbMTONxW7kTmR2PYWGs4xPJj0kiHPZpynsw53d3voitUFvfKQpj0/37RCxNrgHLGLWCj7SC6kzK/ko4FQvaTBh29u8lRosopgkc6mRg/TDHBSmuL9QmIPZ8+Ornk9kcFr0gExKntaYk0gm8ZiOB8gjzTFI7WyvFbldiKijUibiyTyqkNwiw=="
          },
          version: "1.1"
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            result: {
              signature: 'awZ/C8SQz960shxxGpveHE4hmTpZJ2HDE+nwB+afe7Xw2dMk/AoWSuK3CFBg1/7W4gZnsZEhT4qjJoggFItxYsWYDlOnwI8pr5cIvEVczWMlrQM04UEWbTZOArhD/GV0u8yp1K68HtTOCOpcqmV2umwkiXscWURPbp6qANmQfPlBUqMAzX4H6tfGGQ8odzoND9jhEW1tyBoiOxW/N8MAMea0rQymHFmUMn+oHn6eIu8wKKVPchYlP6qJuWalkP/70Htx0eNsXVrAcpoO1KV1EdC6EnzvTJkUWWiwRqDlKMbSrR/xPg/1xIyZ/a2DrmQW04WA4TD0SjTQpYNDwfpS5A==',
              uuid: '3c5eeab5-daa1-4a14-a054-fbc22ca71d94',
              method: 'kyc',
              data: { status: 'FINISH' },
            },
            version: '1.1',
          });
        }));
  });
});
