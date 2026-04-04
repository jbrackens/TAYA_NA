// @flow
const nock = require('nock');
const pq = require('proxyquire');

const pg = require('gstech-core/modules/pg');

const { cleanDb } = require('../../../../utils');
const { content, contentType } = require('../../../../mockData');

// nock.recorder.rec();

nock('https://api.sendgrid.com:443', { encodedQueryParams: true })
  .get('/v3/templates/d-cf306b1fdc6540e1803bbd5a0e9559bb')
  .times(2)
  .reply(
    200,
    {
      id: 'd-cf306b1fdc6540e1803bbd5a0e9559bb',
      name: 'CJ-EN-NEW',
      generation: 'dynamic',
      updated_at: '2020-02-12 09:19:13',
      versions: [
        {
          id: '40d7e258-3658-45d1-aefa-a764dc80f014',
          user_id: 7544497,
          template_id: 'd-cf306b1fdc6540e1803bbd5a0e9559bb',
          active: 1,
          name: 'CasinoJefe template',
          html_content:
            // eslint-disable-next-line max-len
            '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html data-editor-version="2" class="sg-campaigns" xmlns="http://www.w3.org/1999/xhtml"><head>\n      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n      <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1">\n      <!--[if !mso]><!-->\n      <meta http-equiv="X-UA-Compatible" content="IE=Edge">\n      <!--<![endif]-->\n      <!--[if (gte mso 9)|(IE)]>\n      <xml>\n        <o:OfficeDocumentSettings>\n          <o:AllowPNG/>\n          <o:PixelsPerInch>96</o:PixelsPerInch>\n        </o:OfficeDocumentSettings>\n      </xml>\n      <![endif]-->\n      <!--[if (gte mso 9)|(IE)]>\n  <style type="text/css">\n    body {width: 600px;margin: 0 auto;}\n    table {border-collapse: collapse;}\n    table, td {mso-table-lspace: 0pt;mso-table-rspace: 0pt;}\n    img {-ms-interpolation-mode: bicubic;}\n  </style>\n<![endif]-->\n      <style type="text/css">\n    body, p, div {\n      font-family: arial,helvetica,sans-serif;\n      font-size: 14px;\n    }\n    body {\n      color: #000000;\n    }\n    body a {\n      color: #1188E6;\n      text-decoration: none;\n    }\n    p { margin: 0; padding: 0; }\n    table.wrapper {\n      width:100% !important;\n      table-layout: fixed;\n      -webkit-font-smoothing: antialiased;\n      -webkit-text-size-adjust: 100%;\n      -moz-text-size-adjust: 100%;\n      -ms-text-size-adjust: 100%;\n    }\n    img.max-width {\n      max-width: 100% !important;\n    }\n    .column.of-2 {\n      width: 50%;\n    }\n    .column.of-3 {\n      width: 33.333%;\n    }\n    .column.of-4 {\n      width: 25%;\n    }\n    @media screen and (max-width:480px) {\n      .preheader .rightColumnContent,\n      .footer .rightColumnContent {\n        text-align: left !important;\n      }\n      .preheader .rightColumnContent div,\n      .preheader .rightColumnContent span,\n      .footer .rightColumnContent div,\n      .footer .rightColumnContent span {\n        text-align: left !important;\n      }\n      .preheader .rightColumnContent,\n      .preheader .leftColumnContent {\n        font-size: 80% !important;\n        padding: 5px 0;\n      }\n      table.wrapper-mobile {\n        width: 100% !important;\n        table-layout: fixed;\n      }\n      img.max-width {\n        height: auto !important;\n        max-width: 100% !important;\n      }\n      a.bulletproof-button {\n        display: block !important;\n        width: auto !important;\n        font-size: 80%;\n        padding-left: 0 !important;\n        padding-right: 0 !important;\n      }\n      .columns {\n        width: 100% !important;\n      }\n      .column {\n        display: block !important;\n        width: 100% !important;\n        padding-left: 0 !important;\n        padding-right: 0 !important;\n        margin-left: 0 !important;\n        margin-right: 0 !important;\n      }\n    }\n  </style>\n      <!--user entered Head Start--><!--End Head user entered-->\n    </head>\n    <body>\n      <center class="wrapper" data-link-color="#1188E6" data-body-style="font-size:14px; font-family:arial,helvetica,sans-serif; color:#000000; background-color:#FFFFFF;">\n        <div class="webkit">\n          <table cellpadding="0" cellspacing="0" border="0" width="100%" class="wrapper" bgcolor="#FFFFFF">\n            <tbody><tr>\n              <td valign="top" bgcolor="#FFFFFF" width="100%">\n                <table width="100%" role="content-container" class="outer" align="center" cellpadding="0" cellspacing="0" border="0">\n                  <tbody><tr>\n                    <td width="100%">\n                      <table width="100%" cellpadding="0" cellspacing="0" border="0">\n                        <tbody><tr>\n                          <td>\n                            <!--[if mso]>\n    <center>\n    <table><tr><td width="600">\n  <![endif]-->\n                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px;" align="center">\n                                      <tbody><tr>\n                                        <td role="modules-container" style="padding:20px 20px 20px 20px; color:#000000; text-align:left;" bgcolor="#f5f5f5" width="100%" align="left"><table class="module preheader preheader-hide" role="module" data-type="preheader" border="0" cellpadding="0" cellspacing="0" width="100%" style="display: none !important; mso-hide: all; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0;">\n    <tbody><tr>\n      <td role="module-content">\n        <p></p>\n      </td>\n    </tr>\n  </tbody></table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:5px 0px 20px 0px;" bgcolor="#f5f5f5">\n    <tbody>\n      <tr role="module-content">\n        <td height="100%" valign="top">\n          <table class="column" width="560" style="width:560px; border-spacing:0; border-collapse:collapse; margin:0px 0px 0px 0px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="">\n            <tbody>\n              <tr>\n                <td style="padding:0px;margin:0px;border-spacing:0;"><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="0b1585e2-17ab-47bf-8854-4597d69ba9ad">\n    <tbody>\n      <tr>\n        <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="left">\n          <img class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px; max-width:30% !important; width:30%; height:auto !important;" width="168" alt="" data-proportionally-constrained="true" data-responsive="true" src="http://cdn.mcauto-images-production.sendgrid.net/dba14b4f27b2f29f/5bb2b27f-a019-4368-b069-df72eef39d80/259x96.png">\n        </td>\n      </tr>\n    </tbody>\n  </table></td>\n              </tr>\n            </tbody>\n          </table>\n          \n        </td>\n      </tr>\n    </tbody>\n  </table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:0px 0px 0px 0px;" bgcolor="f5f5f5">\n    <tbody>\n      <tr role="module-content">\n        <td height="100%" valign="top">\n          <table class="column" width="560" style="width:560px; border-spacing:0; border-collapse:collapse; margin:0px 0px 0px 0px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="">\n            <tbody>\n              <tr>\n                <td style="padding:0px;margin:0px;border-spacing:0;"><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="a4cc5a21-bb3c-47cb-8994-8255c6181612">\n    <tbody>\n      <tr>\n        <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center"><img class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px; max-width:100% !important; width:100%; height:auto !important;" width="560" alt="" data-proportionally-constrained="true" data-responsive="true" src="{{imageUrl}}"></td>\n      </tr>\n    </tbody>\n  </table></td>\n              </tr>\n            </tbody>\n          </table>\n          \n        </td>\n      </tr>\n    </tbody>\n  </table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:20px 20px 0px 20px;" bgcolor="#FFFFFF">\n    <tbody>\n      <tr role="module-content">\n        <td height="100%" valign="top">\n          <table class="column" width="520" style="width:520px; border-spacing:0; border-collapse:collapse; margin:0px 0px 0px 0px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="">\n            <tbody>\n              <tr>\n                <td style="padding:0px;margin:0px;border-spacing:0;"><table class="module" role="module" data-type="code" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="8d1f6feb-7e1e-4900-8010-cf15594c4e42.1">\n    <tbody>\n      <tr>\n        <td height="100%" valign="top" role="module-content"><div>{{{content}}}</div></td>\n      </tr>\n    </tbody>\n  </table></td>\n              </tr>\n            </tbody>\n          </table>\n          \n        </td>\n      </tr>\n    </tbody>\n  </table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:25px 0px 10px 0px;" bgcolor="#f5f5f5">\n    <tbody>\n      <tr role="module-content">\n        <td height="100%" valign="top">\n          <table class="column" width="560" style="width:560px; border-spacing:0; border-collapse:collapse; margin:0px 0px 0px 0px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="">\n            <tbody>\n              <tr>\n                <td style="padding:0px;margin:0px;border-spacing:0;"><table class="module" role="module" data-type="code" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="8d1f6feb-7e1e-4900-8010-cf15594c4e42">\n    <tbody>\n      <tr>\n        <td height="100%" valign="top" role="module-content"><footer>{{{footer}}}</footer></td>\n      </tr>\n    </tbody>\n  </table></td>\n              </tr>\n            </tbody>\n          </table>\n          \n        </td>\n      </tr>\n    </tbody>\n  </table></td>\n                                      </tr>\n                                    </tbody></table>\n                                    <!--[if mso]>\n                                  </td>\n                                </tr>\n                              </table>\n                            </center>\n                            <![endif]-->\n                          </td>\n                        </tr>\n                      </tbody></table>\n                    </td>\n                  </tr>\n                </tbody></table>\n              </td>\n            </tr>\n          </tbody></table>\n        </div>\n      </center>\n    \n  \n</body></html>',
          plain_content: '{{{content}}}\n\n{{{footer}}}',
          generate_plain_content: true,
          subject: 'Promotion',
          updated_at: '2020-02-14 14:04:11',
          editor: 'design',
          thumbnail_url:
            '//us-east-2-production-thumbnail-bucket.s3.amazonaws.com/d3fedc6dc8624b040e889d592c570d3a35259233d9b8411ccf67fb94b311e173.png',
        },
      ],
    },
    [
       
      'Content-Type',
      'application/json',
    ],
  );

describe('emailRenderer CJ', () => {
  let contentId;
  let renderEmail;

  before(async () => {
    await cleanDb();
    const [cT1] = await pg('content_type')
      .insert({ type: 'email', brandId: 'CJ' })
      .returning('id');
    expect(cT1.id).to.exist();
    const contentTypeId = cT1.id;
    const [c1] = await pg('content').insert(
      {
        contentTypeId,
        name: 'CJ_Something',
        externalId: '111',
        content: JSON.stringify({
          image: 'banners/email/cj_canada_generic.jpg',
          type: 'campaign',
          lander: '',
          en: {
            subject: 'Add 550 coins!!',
            text: 'Hey {name},\n\n{currency:50} \n\n{link|Login now} also {dish}',
          },
        }),
      })
      .returning('id')
    expect(c1.id).to.exist();
    contentId = c1.id;
    const [cT] = await pg('content_type')
      .insert({ ...contentType[5], brandId: 'CJ' })
      .returning('id');
    expect(cT.id).to.exist();
    const ctid = cT.id;
    await pg('content').insert({ ...content[8], contentTypeId: ctid })

    renderEmail = pq('../../emailRenderer', {
      'gstech-core/modules/logger': {
        warn: (text) =>
          expect(text).to.equal(`!!! EmailRenderer:prepareContent:${contentId} NO_LANG:fi`),
      },
    }).renderEmail;
  });

  it('Renders properly email', async () => {
    const renderedEmail = await renderEmail(contentId, {
      firstName: 'Terry',
      languageId: 'en',
      currencyId: 'EUR',
      email: 'terry@gmail.com',
    }, { values: { dish: 'burrito' }});

    // fs.writeFileSync('./server/renderers/tests/CJ/email.html', renderedEmail);

    expect(renderedEmail).to.include('<html');
    expect(renderedEmail).to.include('Hey Terry,');
    expect(renderedEmail).to.include('href="https://casinojefe.com/">Login now</a>');
    expect(renderedEmail).to.include(
      'href="https://casinojefe.com/en/subscriptions?token=1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed">here</a>',
    );
    expect(renderedEmail).to.include('also burrito');
    expect(renderedEmail).to.not.include('{{');
    expect(renderedEmail).to.not.include('}}');
  });

  it('Renders properly email with default language', async () => {
    const renderedEmail = await renderEmail(contentId, {
      firstName: 'Terry',
      languageId: 'fi',
      currencyId: 'EUR',
      email: 'terry@gmail.com',
    }, { values: { dish: 'burrito' }});

    // fs.writeFileSync('./server/renderers/tests/CJ/email.html', renderedEmail);

    expect(renderedEmail).to.include('Hey Terry,');
  });
});
