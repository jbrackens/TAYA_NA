/* @flow */
const _ = require('lodash');

const freespinsTemplate: any = _.template(`<div id="wheel-result-bounty" class="wheel-result"><img/>
  <div class="wheel-result-content">
    <h2><%- localize("jefe.wheel2." + spintype + "spinswon")  %></h2>
    <p><%- localize("jefe.wheel2." + spintype + "spinswontext")  %></p>
    <div class="button-holder"><a href="/loggedin/myaccount/bounties/" class="button"><%- localize("jefe.wheel2.spinsgeneralwonbutton")  %></a></div>
  </div>
</div>`);

const jackpotTemplate: any = _.template(`<div id="wheel-result-jackpot" class="wheel-result">
  <div class="wheel-result-content">
    <div class="jackpotinfo"></div>
    <p><%- localize("jefe.wheel2.jackpotwontext")  %></p>
    <div class="button-holder"><a href="/loggedin/myaccount/wheel/" class="button"><%- localize("jefe.wheel2.jackpotwonbutton")  %></a></div>
  </div>
</div>`);

module.exports = { jackpotTemplate, freespinsTemplate };
