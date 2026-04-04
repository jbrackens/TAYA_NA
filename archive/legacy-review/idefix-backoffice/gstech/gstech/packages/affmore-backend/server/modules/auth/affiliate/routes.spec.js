/* @flow */
const request = require('supertest');  
const pg = require('gstech-core/modules/pg');
const mailEmu = require('gstech-core/modules/mailer/mailEmu');

const app = require('../../../app');
const repository = require('../../admin/affiliates/repository');
const linksRepository = require('../../admin/affiliates/links/repository');
const config = require('../../../config');

const timeStamp = new Date().getTime();

describe('Affiliates Auth Routes', () => {
  let pinCode;
  let affiliateId;
  let authToken;

  describe('Register', () => {
    it('can call register', async () => {
      await request(app)
        .post('/api/v1/auth/affiliate/register')
        .set('Cookie', ['affmore-ref=123123'])
        .send({
          email: `johnny${timeStamp}@bravo.com`,
          password: '123456789',

          paymentMethod: 'skrill',
          paymentMethodDetails: {},

          name: 'Bravo Company',
          contactName: 'Johnny Bravo',
          countryId: 'EE',
          address: 'Robinsoni 25',
          phone: '',
          skype: '',
          vatNumber: '',
          info: '',
        })
        .expect(async (res) => {
          affiliateId = res.body.data.affiliateId;
          expect(res.header['x-auth-token']).to.exist();
          expect(res.body).to.deep.equal({
            data: {
              affiliateId: res.body.data.affiliateId,
            },
          });
        })
        .expect(200);

      const links = await linksRepository.getAffiliateLinks(pg, affiliateId);
      expect(links).to.containSubset([
        {
          affiliateId,
          planId: null,
          brandId: 'LD',
          name: 'Default Link LuckyDino',
          landingPage: 'https://luckydino.com',
          deal: null,
        },
        {
          affiliateId,
          planId: null,
          brandId: 'CJ',
          name: 'Default Link CasinoJEFE',
          landingPage: 'https://casinojefe.com',
          deal: null,
        },
        {
          affiliateId,
          planId: null,
          brandId: 'KK',
          name: 'Default Link JustWOW',
          landingPage: 'https://justwow.com',
          deal: null,
        },
        {
          affiliateId,
          planId: null,
          brandId: 'OS',
          name: 'Default Link OlaSpill',
          landingPage: 'https://olaspill.com',
          deal: null,
        },
      ]);
    });

    it('can call register without allowEmail field', async () => {
      await request(app)
        .post('/api/v1/auth/affiliate/register')
        .send({
          email: `jack${timeStamp}@bravo.com`,
          password: '123456789',

          paymentMethod: 'skrill',
          paymentMethodDetails: {},

          name: 'Bravo Company',
          contactName: 'Johnny Bravo',
          countryId: 'EE',
          address: 'Robinsoni 25',
          phone: '+372 56468932',
          skype: 'johnny.bravo',
          vatNumber: '123456789',
          info: 'test info',
        })
        .expect(async (res) => {
          expect(res.body).to.deep.equal({
            data: {
              affiliateId: res.body.data.affiliateId,
            },
          });
          expect(res.header['x-auth-token']).to.exist();

          const affiliate = await repository.findAffiliateByEmail(pg, `jack${timeStamp}@bravo.com`);
          expect(affiliate && affiliate.allowEmails).to.be.equal(true);
          expect(affiliate && affiliate.isInternal).to.be.equal(false);
        })
        .expect(200);
    });

    it('can call register with @luckydino.com email', async () => {
      const ts = new Date().getTime();
      await request(app)
        .post('/api/v1/auth/affiliate/register')
        .send({
          email: `johnny${ts}@luckydino.com`,
          password: '123456789',

          paymentMethod: 'skrill',
          paymentMethodDetails: {},

          name: 'Bravo Company',
          contactName: 'Johnny Bravo',
          countryId: 'EE',
          address: 'Robinsoni 25',
          phone: '+372 56468932',
          skype: 'johnny.bravo',
          vatNumber: '123456789',
          info: 'test info',
        })
        .expect(async (res) => {
          expect(res.body).to.deep.equal({
            data: {
              affiliateId: res.body.data.affiliateId,
            },
          });
          expect(res.header['x-auth-token']).to.exist();
        })
        .expect(200);

      const affiliate = await repository.findAffiliateByEmail(pg, `johnny${ts}@luckydino.com`);
      expect(affiliate && affiliate.isInternal).to.be.equal(true);
    });

    it('can fail register with wrong email', async () => {
      await request(app)
        .post('/api/v1/auth/affiliate/register')
        .send({
          email: 'johnnybravo.com',
          password: '123456789',

          paymentMethod: 'skrill',
          paymentMethodDetails: {},

          name: 'Bravo Company',
          contactName: 'Johnny Bravo',
          countryId: 'EE',
          address: 'Robinsoni 25',
          phone: '372 56468932',
          skype: 'johnny.bravo',
          vatNumber: '123456789',
          info: 'test info',
          allowEmails: true,
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            error: {
              message: '{\n  "affiliate,email": "Email must be a valid email"\n}',
            },
          });
          expect(res.header['x-auth-token']).to.not.exist();
        })
        .expect(400);
    });

    it('can fail register with wrong data', async () => {
      await request(app)
        .post('/api/v1/auth/affiliate/register')
        .send({
          paymentMethod: 'skrill',
          paymentMethodDetails: {},

          email: 'johnny@bravo.com',
          password: '123456789',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            error: {
              message:
                '{\n  "affiliate,name": "Name is required",\n  "affiliate,contactName": "Contact name is required",\n  "affiliate,countryId": "Country id is required",\n  "affiliate,address": "Address is required"\n}',
            },
          });
          expect(res.header['x-auth-token']).to.not.exist();
        })
        .expect(400);
    });

    it('can fail register with same user', async () => {
      await request(app)
        .post('/api/v1/auth/affiliate/register')
        .send({
          email: `johnny${timeStamp}@bravo.com`,
          password: '123456789',

          paymentMethod: 'skrill',
          paymentMethodDetails: {},

          name: 'Bravo Company',
          contactName: 'Johnny Bravo',
          countryId: 'EE',
          address: 'Robinsoni 25',
          phone: '372 56468932',
          skype: 'johnny.bravo',
          vatNumber: '123456789',
          info: 'test info',
          allowEmails: true,
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            error: {
              message: 'Affiliate with this email address is already registered',
            },
          });
          expect(res.header['x-auth-token']).to.not.exist();
        })
        .expect(409);
    });

    it('can register as sub-affiliate', async () => {
      const affiliate = await repository.findAffiliateByEmail(pg, `johnny${timeStamp}@bravo.com`);

      if (!affiliate) {
        throw Error(`Affiliate not found: johnny${timeStamp}@bravo.com}`);
      }

      await request(app)
        .post(`/api/v1/auth/affiliate/register?referral=${affiliate.id}`)
        .send({
          email: `new${timeStamp}@user.com`,
          password: '123456789',

          paymentMethod: 'skrill',
          paymentMethodDetails: {},

          name: 'Bravo Company',
          contactName: 'Johnny Bravo',
          countryId: 'EE',
          address: 'Robinsoni 25',
          phone: '372 56468932',
          skype: 'johnny.bravo',
          vatNumber: '123456789',
          info: 'test info',
          allowEmails: true,
        })
        .expect(async (res) => {
          expect(res.body.data.affiliateId).to.be.a('number');
          expect(res.header['x-auth-token']).to.exist();

          const subAffiliates = await repository.getSubAffiliates(pg, affiliateId);
          expect(subAffiliates.length).to.equal(1);
        })
        .expect(200);
    });
  });

  describe('Login', () => {
    it('can call login', async () => {
      await request(app)
        .post('/api/v1/auth/affiliate/login')
        .send({
          email: `johnny${timeStamp}@bravo.com`,
          password: '123456789',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            data: {
              affiliateId: res.body.data.affiliateId,
              tcAccepted: true,
            },
          });
          expect(res.header['x-auth-token']).to.exist();
        })
        .expect(200);
    });

    it('can call login with random letter case ', async () => {
      await request(app)
        .post('/api/v1/auth/affiliate/login')
        .send({
          email: `JOHNNY${timeStamp}@bravo.COM`,
          password: '123456789',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            data: {
              affiliateId: res.body.data.affiliateId,
              tcAccepted: true,
            },
          });
          expect(res.header['x-auth-token']).to.exist();
        })
        .expect(200);
    });

    it('can call login with not accepted tc', async () => {
      config.tcVersion = 1;
      await request(app)
        .post('/api/v1/auth/affiliate/login')
        .send({
          email: `johnny${timeStamp}@bravo.com`,
          password: '123456789',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            data: {
              affiliateId: res.body.data.affiliateId,
              tcAccepted: false,
            },
          });
          expect(res.header['x-auth-token']).to.exist();
          authToken = res.header['x-auth-token'];
        })
        .expect(200);
    });

    it('can call tc accept', async () => {
      await request(app)
        .post('/api/v1/auth/affiliate/accept-tc')
        .send()
        .set('x-auth-token', authToken)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            data: {
              ok: true,
            },
          });
        })
        .expect(200);

      await request(app)
        .post('/api/v1/auth/affiliate/login')
        .send({
          email: `johnny${timeStamp}@bravo.com`,
          password: '123456789',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            data: {
              affiliateId: res.body.data.affiliateId,
              tcAccepted: true,
            },
          });
          expect(res.header['x-auth-token']).to.exist();
        })
        .expect(200);
      config.tcVersion = 0;
    });

    it('can fail login with wrong password', async () => {
      await request(app)
        .post('/api/v1/auth/affiliate/login')
        .send({
          email: `johnny${timeStamp}@bravo.com`,
          password: 'wrong_pass',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            error: {
              message: 'Affiliate email and/or password is incorrect',
            },
          });
          expect(res.header['x-auth-token']).to.not.exist();
        })
        .expect(403);
    });

    it('can fail login with wrong data', async () => {
      await request(app)
        .post('/api/v1/auth/affiliate/login')
        .send({
          email2: `johnny${timeStamp}@bravo.com`,
          password: '123456789',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            error: {
              message: '{\n  "email": "Email is required"\n}',
            },
          });
          expect(res.header['x-auth-token']).to.not.exist();
        })
        .expect(400);
    });

    it('can fail login with wrong user', async () => {
      await request(app)
        .post('/api/v1/auth/affiliate/login')
        .send({
          email: 'jackie@bravo.com',
          password: '123456789',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            error: {
              message: 'Affiliate email and/or password is incorrect',
            },
          });
          expect(res.header['x-auth-token']).to.not.exist();
        })
        .expect(403);
    });

    it('can fail login with closed affiliate', async () => {
      const affiliate: any = await repository.findAffiliateByEmail(pg, `johnny${timeStamp}@bravo.com`);
      affiliate.isClosed = true;
      await repository.updateAffiliate(pg, affiliate.id, affiliate);
      await request(app)
        .post('/api/v1/auth/affiliate/login')
        .send({
          email: affiliate.email,
          password: '123456789',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            error: {
              message: 'Affiliate account is closed',
            },
          });
          expect(res.header['x-auth-token']).to.not.exist();
        })
        .expect(403);
        affiliate.isClosed = false;
        await repository.updateAffiliate(pg, affiliate.id, affiliate);
    });
  });

  describe('Password Forgot', () => {
    it('can call password forgot', async () => {
      mailEmu.registerReceiver((email) => {
        const matches = email.html.match(/Your affmore\.com verification code is: \d+/);
        const moreMatches = ((matches && matches[0]) || '').match(/\d+/);
        pinCode = (moreMatches && moreMatches[0]) || '';

        expect(email.html).to.contain(`Your affmore.com verification code is: ${pinCode}`);
        expect(email).to.containSubset({
          to: `johnny${timeStamp}@bravo.com`,
        });
      });

      await request(app)
        .post('/api/v1/auth/affiliate/password/forgot')
        .send({
          email: `johnny${timeStamp}@bravo.com`,
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            data: {
              ok: true,
            },
          });

          expect(res.header['x-auth-token']).to.not.exist();
        })
        .expect(200);
    });

    it('can fail password forgot with wrong data', async () => {
      await request(app)
        .post('/api/v1/auth/affiliate/password/forgot')
        .send({
          email2: `johnny${timeStamp}@bravo.com`,
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            error: {
              message: '{\n  "email": "Email is required"\n}',
            },
          });
          expect(res.header['x-auth-token']).to.not.exist();
        })
        .expect(400);
    });

    it('can fail password forgot with wrong user', async () => {
      await request(app)
        .post('/api/v1/auth/affiliate/password/forgot')
        .send({
          email: 'jackie@bravo.com',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            error: {
              message: 'Affiliate email not found',
            },
          });
          expect(res.header['x-auth-token']).to.not.exist();
        })
        .expect(404);
    });
  });

  describe('Password Update', () => {
    it('can call password update', async () => {
      await request(app)
        .post('/api/v1/auth/affiliate/password/update')
        .send({
          email: `johnny${timeStamp}@bravo.com`,
          pinCode,
          newPassword: '987654321',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            data: {
              ok: true,
            },
          });
          expect(res.header['x-auth-token']).to.not.exist();
        })
        .expect(200);

      await request(app)
        .post('/api/v1/auth/affiliate/login')
        .send({
          email: `johnny${timeStamp}@bravo.com`,
          password: '123456789',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            error: {
              message: 'Affiliate email and/or password is incorrect',
            },
          });
          expect(res.header['x-auth-token']).to.not.exist();
        })
        .expect(403);

      await request(app)
        .post('/api/v1/auth/affiliate/login')
        .send({
          email: `johnny${timeStamp}@bravo.com`,
          password: '987654321',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            data: {
              affiliateId: res.body.data.affiliateId,
              tcAccepted: false,
            },
          });
          expect(res.header['x-auth-token']).to.exist();

          authToken = res.header['x-auth-token'];
        })
        .expect(200);
    });

    it('can fail password update with wrong pin code', async () => {
      await request(app)
        .post('/api/v1/auth/affiliate/password/update')
        .send({
          email: `johnny${timeStamp}@bravo.com`,
          pinCode: '555555',
          newPassword: '987654321',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            error: {
              message: 'Pin code is not valid',
            },
          });
          expect(res.header['x-auth-token']).to.not.exist();
        })
        .expect(400);
    });

    it('can fail password update with wrong data', async () => {
      await request(app)
        .post('/api/v1/auth/affiliate/password/update')
        .send({
          email: `johnny${timeStamp}@bravo.com`,
          pinCode: '123456',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            error: {
              message: '{\n  "newPassword": "New password is required"\n}',
            },
          });
          expect(res.header['x-auth-token']).to.not.exist();
        })
        .expect(400);
    });

    it('can fail password update with wrong user', async () => {
      await request(app)
        .post('/api/v1/auth/affiliate/password/update')
        .send({
          email: 'jackie@bravo.com',
          pinCode: '123456',
          newPassword: '987654321',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            error: {
              message: 'Affiliate email not found',
            },
          });
          expect(res.header['x-auth-token']).to.not.exist();
        })
        .expect(404);
    });
  });

  describe('Password Change', () => {
    it('can call password change', async () => {
      await request(app)
        .post(`/api/v1/auth/affiliate/password/change`)
        .send({
          email: `johnny${timeStamp}@bravo.com`,
          oldPassword: '987654321',
          newPassword: '123456789',
        })
        .set('x-auth-token', authToken)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            data: {
              ok: true,
            },
          });
        })
        .expect(200);
    });

    it('can fail call password change by not authenticated client', async () => {
      await request(app)
        .post(`/api/v1/auth/affiliate/password/change`)
        .send({
          email: `johnny${timeStamp}@bravo.com`,
          oldPassword: '123456789',
          newPassword: '987654321',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            error: {
              message: 'Access denied.',
            },
          });
        })
        .expect(401);
    });

    it('can fail password change with same oldPassword and newPassword', async () => {
      await request(app)
        .post(`/api/v1/auth/affiliate/password/change`)
        .send({
          email: `johnny${timeStamp}@bravo.com`,
          oldPassword: '123456789',
          newPassword: '123456789',
        })
        .set('x-auth-token', authToken)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            error: {
              message: '{\n  "newPassword": "New password contains an invalid value"\n}',
            },
          });
        })
        .expect(400);
    });

    it('can fail password change with incorrect oldPassword', async () => {
      await request(app)
        .post(`/api/v1/auth/affiliate/password/change`)
        .send({
          email: `johnny${timeStamp}@bravo.com`,
          oldPassword: '12345678910',
          newPassword: '1112315123',
        })
        .set('x-auth-token', authToken)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            error: {
              message: 'Old password is not valid',
            },
          });
        })
        .expect(400);
    });
  });
});
