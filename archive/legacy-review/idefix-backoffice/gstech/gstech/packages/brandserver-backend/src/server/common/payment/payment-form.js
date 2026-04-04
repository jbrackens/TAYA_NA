/* @flow */
const { v1: uuid } = require('uuid');

const mapField = ([key, value]: [any, any]) => `<input type="hidden" name="${key}" value="${value}"/>`;

const create = (action: string, fields: any, method: 'GET' | 'POST' = 'POST', formId: string = uuid()): string => {
  const form = `<html style="margin: 0; padding: 0">
    <head>
      <meta charset="utf-8"/>
      <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0"/>
    </head>
    <body style="margin: 0; padding: 0">
      <form action="${action}" method="${method}" id="form_${formId}" target="_self">
        ${Object.entries(fields || {})
    .map(mapField)
    .join('')}
      </form>
      <script type="text/javascript">
        document.getElementById('form_${formId}').submit();
      </script>
    </body>
  </html>`;
  return form;
};

module.exports = { create };
