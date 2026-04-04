/* @flow */
const paymentForm = require('./payment-form');

describe('Payments form', () => {
  it('generates a valid form', () => {
    const form = paymentForm.create('http://google.com', { q: 1, foo: 'bar' }, 'POST', 'x');
    expect(form).to.equal(`<html style="margin: 0; padding: 0">
    <head>
      <meta charset="utf-8"/>
      <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0"/>
    </head>
    <body style="margin: 0; padding: 0">
      <form action="http://google.com" method="POST" id="form_x" target="_self">
        <input type="hidden" name="q" value="1"/><input type="hidden" name="foo" value="bar"/>
      </form>
      <script type="text/javascript">
        document.getElementById('form_x').submit();
      </script>
    </body>
  </html>`);
  });
});
