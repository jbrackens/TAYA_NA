/* @flow */
const config = require('./config');

export type TemplateOptions = {
  email: string,
  title?: string,
  text?: string,
  invoiceImage?: boolean,
  action?: {
    text: string,
    href: string,
  },
};

function generateEmailTemplate({
  title,
  text,
  email,
  action,
  invoiceImage = false,
}: TemplateOptions): string {
  return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style type="text/css">
            @media screen and (max-width: 700px) {
              .mobile-content {
                padding: 0 10px 0 10px;
              }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #eeeeee; font-family: 'Trebuchet MS', sans-serif">
          <table
            align="center"
            border="0"
            cellpadding="0"
            cellspacing="0"
            style="border-collapse: collapse"
            width="100%"
            bgcolor="#eeeeee"
          >
            <tr>
              <td align="center">
                <div style="max-width: 640px !important">
                  <table
                    id="content"
                    align="center"
                    border="0"
                    cellpadding="0"
                    cellspacing="0"
                    style="border-collapse: collapse"
                    width="100%"
                  >
                    <tr align="center">
                      <td style="padding: 32px 0 32px 0">
                        <img
                          src="${config.ui.affmore}/static/images/affmore-logo.png"
                          alt="Affmore logo"
                          width="222"
                          height="32"
                          style="display: block; border: 0"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td class="mobile-content">
                        <table
                          id="main"
                          border="0"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          border-radius="16px"
                          style="padding: 32px 32px 32px 32px; border-radius: 16px"
                          bgcolor="#ffffff"
                        >
                          ${
                            invoiceImage
                              ? `<tr align="center">
                                  <td>
                                    <img
                                      src="${config.ui.affmore}/static/images/bill.png"
                                      alt="Bill"
                                      width="80"
                                      height="80"
                                      style="display: block; border: 0"
                                    />
                                  </td>
                                </tr>`
                              : ''
                          }
                          ${
                            title
                              ? `<tr align="center">
                                  <td style="padding: 16px 0px 16px 0px; font-size: 32px; font-weight: bold; line-height: 40px">
                                    ${title}
                                  </td>
                                </tr>`
                              : ''
                          }
                          ${
                            text
                              ? `<tr align="center">
                                  <td style="font-size: 16px; line-height: 24px; color: #616161">
                                    ${text}
                                  </td>
                                </tr>`
                              : ''
                          }
                          ${
                            action
                              ? `<tr align="center">
                                  <td style="padding: 24px 0 0 0">
                                    <a
                                      href=${action.href}
                                      target="_blank"
                                      style="
                                        display: block;
                                        background-color: #ff9800;
                                        border-radius: 8px;
                                        padding: 12px 12px 12px 12px;
                                        color: #ffffff;
                                        text-decoration: none;
                                      "
                                      >${action.text}</a
                                    >
                                  </td>
                                </tr>`
                              : ''
                          }
                        </table>
                      </td>
                    </tr>
                    <tr align="center">
                      <td class="mobile-content">
                        <table
                          id="footer"
                          border="0"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          style="font-size: 12px; line-height: 20px; opacity: 0.32; padding: 32px 0 32px 0"
                        >
                          ${
                            email
                              ? `<tr align="center">
                                  <td>This email was sent to ${email}</td>
                                </tr>`
                              : ''
                          }
                          <tr align="center">
                            <td>Affmore, Inc. | 350 Fifth Avenue, 21st Floor | Tallinn 38291 | Estonia</td>
                          </tr>
                          <tr align="center">
                            <td>© 1990-${new Date().getFullYear()} All rights reserved - Affmore</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
          </table>
        </body>
      </html>`;
}

module.exports = { generateEmailTemplate };
