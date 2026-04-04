/* @flow */

const create = (
  brandId: BrandId,
  sessionToken: string,
  urls: URLFork,
  meta: string = ''
): string => {
  const form = `<html style="margin: 0; padding: 0">
    <head>
      <meta charset="utf-8"/>
      <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0"/>
      <script src="https://client.britepaymentgroup.com/client.js"></script>
      <style type="text/css">
        #BritePayment iframe {
          width: ${meta === "pnp" ? '100%' : '280px'} !important;
          height: ${meta === "pnp" ? '100%' : '520px'} !important;
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0">
      <div id="BritePayment"></div>
      <script>
        var client = new Brite("${sessionToken}");
        client.start({
          selector: "#BritePayment"
        },
        function(state) {
          console.log("STATE", state)
          if (state == Brite.STATE_COMPLETED) window.top.location.href = "${urls.ok}";
          else if (state == Brite.STATE_FAILED || state == Brite.STATE_ABORTED) window.top.location.href = "${urls.failure}";
        },
        function() {
          client.stop();
          window.top.location.href = "${meta === "identify" ? urls.failure : urls.ok}";
        });
      </script>
    </body>
  </html>`;
  return form;
};

module.exports = { create };
