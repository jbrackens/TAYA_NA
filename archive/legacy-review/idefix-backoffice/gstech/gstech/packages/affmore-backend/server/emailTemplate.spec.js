/* @flow */
const { expect } = require('chai');
const cheerio = require('cheerio');
const config = require('./config');
const { generateEmailTemplate } = require('./emailTemplate');

describe('Email Template tests', () => {
  it('should render main content correctly', () => {
    const templateOptions = {
      email: 'test@gmail.com',
      text: 'This is text',
    };

    const emailTemplate = generateEmailTemplate(templateOptions);

    const $ = cheerio.load(emailTemplate);

    const [logoNode] = $('table#content tbody tr td img');
    const [mainContentNode] = $('table#main tbody tr td');
    const [emailNode, addressNode, copyrightTextNode] = $('table#footer tbody tr td');

    expect($(logoNode).attr('src')).to.be.equal(
      `${config.ui.affmore}/static/images/affmore-logo.png`,
    );
    expect($(logoNode).attr('alt')).to.be.equal('Affmore logo');
    expect($(mainContentNode).text().trim()).to.be.equal(templateOptions.text);
    expect($(emailNode).text()).to.be.equal(`This email was sent to ${templateOptions.email}`);
    expect($(addressNode).text()).to.be.equal(
      'Affmore, Inc. | 350 Fifth Avenue, 21st Floor | Tallinn 38291 | Estonia',
    );
    expect($(copyrightTextNode).text()).to.be.equal(
      `© 1990-${new Date().getFullYear()} All rights reserved - Affmore`,
    );
  });

  it('should render content correctly with additional parameters', () => {
    const templateOptions: any = {
      email: 'test@gmail.com',
      text: 'This is text',
      title: 'You need to check and approve the invoice',
      invoiceImage: true,
      action: {
        text: 'Go To Invoices',
        href: 'https://affmore.com',
      },
    };

    const emailTemplate = generateEmailTemplate(templateOptions);

    const $ = cheerio.load(emailTemplate);

    const [contentImageNode, contentTitleNode, contentTextNode, contentActionNode] =
      $('table#main tbody tr td');

    expect($(contentImageNode).find('img').attr('src')).to.be.equal(
      `${config.ui.affmore}/static/images/bill.png`,
    );
    expect($(contentImageNode).find('img').attr('alt')).to.be.equal('Bill');
    expect($(contentTitleNode).text().trim()).to.be.equal(
      'You need to check and approve the invoice',
    );
    expect($(contentTextNode).text().trim()).to.be.equal(templateOptions.text);
    expect($(contentActionNode).find('a').attr('href')).to.be.equal(templateOptions.action.href);
    expect($(contentActionNode).find('a').text()).to.be.equal(templateOptions.action.text);
  });
});
