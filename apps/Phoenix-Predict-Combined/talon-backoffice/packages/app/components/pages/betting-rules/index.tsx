import Head from "next/head";
import { defaultNamespaces } from "../defaults";
import { useTranslation } from "i18n";
import { StaticContentBlock } from "../../static-page";

function BettingRules() {
  const { t } = useTranslation(["page-betting-rules"]);
  return (
    <>
      <Head>
        <title>{t("TITLE")}</title>
      </Head>
      <>
        <StaticContentBlock
          title={t("TITLE")}
          content={
            <>
              <p>
                <strong>General Rules</strong>
              </p>
              <ol>
                <li>
                  Vie.gg is the betting name of Esports Entertainment Group
                  Inc., its subsidiary LLCs, and its related services ('Esports
                  Entertainment'). Esports Entertainment’s General{" "}
                  <a href="/terms-and-conditions">Terms and Conditions</a> and{" "}
                  <a href="/privacy-policy">Privacy Policy</a> apply in addition
                  to these House Rules. If there is a conflict, the Terms and
                  Conditions shall apply.
                </li>
                <li>
                  Esports Entertainment prohibits persons under the age of
                  twenty-one (21) from participating on the Esports
                  Entertainment website or mobile application (collectively, the
                  “Website”).{" "}
                </li>
                <li>
                  Esports Entertainment only accepts wagers from patrons
                  registered on the Website (‘Members’) who are located in the
                  State of New Jersey. By participating on the Website, you
                  agree that your location information may be used to confirm
                  your presence in New Jersey.{" "}
                </li>
                <li>
                  Each Member shall only have access to his or her own account
                  (‘Account’). No person may access someone else’s account, or
                  place a wager on behalf of another person, at any time.
                </li>
                <li>
                  Customers wishing to make a complaint should contact Customer
                  Support by (a) visiting Live Chat; (b)
                  emailing&nbsp;help@vie.gg; or (c) calling +1 (855) 944-3578.
                  Esports Entertainment will make every reasonable effort to
                  resolve disputes. For more information on the Dispute Process,
                  visit our{" "}
                  <a href="/responsible-gaming">Responsible Gaming page</a>.
                </li>
                <li>
                  Esports Entertainment aims to provide a safe and responsible
                  environment for Members and will always recognize and
                  acknowledge the Member’s ability to self-exclude at any time.
                  If you self-exclude from another New Jersey licensed gambling
                  site, you will automatically be self-excluded from Vie.gg.
                  Further information regarding the Division of Gaming
                  Enforcement’s self-exclusion program can be found at{" "}
                  <a href="https://www.njoag.gov/about/divisions-and-offices/division-of-gaming-enforcement-home/self-exclusion-program/">
                    https://www.njoag.gov/about/divisions-and-offices/division-of-gaming-enforcement-home/self-exclusion-program/
                  </a>
                  .{" "}
                </li>
                <li>
                  Further information relating to responsible gaming can be
                  found on our{" "}
                  <a href="/responsible-gaming">Responsible Gaming page</a>.
                </li>
              </ol>
              <p>
                <strong>Funding an Account</strong>
              </p>
              <ol>
                <li>
                  To wager on events, a Member must first fund his or her
                  Account. Deposited funds are made available via a payment
                  processor, and may take time to process. Funds will be
                  deposited into a Member’s Account upon actual receipt of funds
                  by Esports Entertainment.{" "}
                </li>
                <li>
                  Subject to applicable regulatory restrictions, Members can
                  deposit using the following methods:
                </li>
              </ol>
              <ul>
                <li>Debit Cards</li>
                <li>Credit Cards</li>
                <li>Prepay/Gift Cards</li>
                <li>Cash deposits</li>
              </ul>
              <ol>
                <li>
                  Current available payment methods can be viewed within the
                  Cashier (accessible by clicking the balance on Vie.gg when a
                  Member is logged in to their Account). Esports Entertainment
                  reserves the right to remove or add payment options at any
                  time.
                </li>
                <li>
                  A Member can request a withdrawal of winnings from the Cashier
                  as follows:
                </li>
              </ol>
              <ul>
                <li>
                  by clicking on ‘Withdraw by Check’: Once a withdraw request
                  has been processed, Esports Entertainment will send out a
                  check for the amount of the withdrawal to the address listed
                  on the Member’s Account; or
                </li>
                <li>
                  by clicking on ‘Withdrawal at Bally’s AC Cage’: This will
                  generate a transaction ID which can be used to redeem the cash
                  withdrawal at the cage in Bally’s Casino, Atlantic City.
                </li>
              </ul>
              <ol>
                <li>
                  Deposits and withdrawals are always subject to review. In the
                  case of suspected or fraudulent activity, or other undesirable
                  risk, Esports Entertainment may suspend or terminate a
                  Member’s Account and may refund or refuse to refund any monies
                  contained in their account in Esports Entertainment’s absolute
                  discretion. Any matters of inappropriate or fraudulent use of
                  any payment method will be reported to the relevant authority.
                  The Member’s Account may also be permanently closed at our
                  discretion at any time.
                </li>
                <li>
                  Esports Entertainment has a number of controls and checks in
                  place during the withdrawal process. In order to protect a
                  Member’s funds, Esports Entertainment implements a number of
                  security checks before any withdrawal request is processed.
                  Esports Entertainment reserves the right to withhold any
                  withdrawal until these checks have been completed. Withdrawals
                  are generally expected to be processed within twenty-four (24)
                  hours, however they may take up to five (5) working days.
                  Members should allow further time for postage of checks, as
                  follows:
                </li>
              </ol>
              <ul>
                <li>
                  checks under $100 will be sent via standard USPS, which can
                  take approximately seven (7) to ten (10) business days for
                  delivery
                </li>
                <li>
                  checks $100 or more will be sent via priority USPS with
                  tracking details, which can take approximately five (5) to
                  seven (7) business days for delivery.
                </li>
              </ul>
              <ol>
                <li>
                  Members are able to access statements for the last 6 months
                  online through the ‘Transaction History’ page of the{" "}
                  <a href="/account/transactions">Website</a>. Statements for
                  the last 6 months can also be obtained by contacting contact
                  Customer Support by emailing&nbsp;help@vie.gg or calling +1
                  (855) 944-3578.
                </li>
              </ol>
              <p>
                <strong>Obvious Errors</strong>
              </p>
              <p>
                Esports Entertainment makes every effort to ensure that no
                errors are made in prices offered on the Website or bets
                accepted on an Account. However, Esports Entertainment reserves
                the right to correct any obvious errors and to void any wagers
                where such has occurred, and refund the stake to the Member’s
                Account. Member
              </p>
              <p>
                Obvious errors include, but are not limited to, the following:
              </p>
              <ul>
                <li>
                  Wagers offered or placed on events after the outcome is
                  already known;
                </li>
                <li>
                  Wagers offered or placed on markets where incorrect
                  participants are listed;
                </li>
                <li>
                  Wagers offered or placed on markets where participants are
                  incorrectly designated or listed in the incorrect order;
                </li>
                <li>
                  Wagers offered or placed at odds that are materially different
                  from those available in the general betting market for the
                  event at the time the wager was placed;
                </li>
                <li>
                  Wagers offered or placed at odds which reflect an incorrect
                  score situation;{" "}
                </li>
                <li>Wagers offered on unapproved events; or</li>
                <li>
                  Wagers offered or placed at odds being clearly incorrect given
                  the probability of the event occurring (or not occurring) at
                  the time the wager was placed.
                </li>
              </ul>
              <p>
                <strong>Re-settlement</strong>
              </p>
              <p>
                Esports Entertainment reserves the right to reverse a wager
                settlement if a market is settled in error. Esports
                Entertainment reserves the right to take any necessary action,
                without prior notice and within reasonable limits, to adjust any
                inaccuracy in a Member’s Account due to a settlement error,
                including through the reversal, amendment, or cancellation, of
                any subsequent transaction. This may result in an amendment to
                an account balance and/or deduction of funds from a Member’s
                Account.
              </p>
              <p>
                <strong>General Sports Book Rules</strong>
              </p>
              <ol>
                <li>
                  Esports Entertainment accepts wagers on its posted terms.
                </li>
                <li>
                  Prices on the Website are indicative only and, due to
                  technological limitations (for example, internet data transfer
                  protocols), may not be the most up-to-date price. A wager will
                  only be placed when a Member’s offer has been (a) actually
                  received and (b) expressly accepted. In all cases when a wager
                  is accepted by Esports Entertainment, we will generate an
                  internal bet reference number.
                </li>
                <li>
                  Any sport event data, including, but not limited to, event
                  results, scores or other statistical data is provided “as is”
                  with no representation or warranty.
                </li>
                <li>
                  Esports Entertainment endeavors to keep Members informed,
                  whether through the Website, email, promotional materials or
                  otherwise, of the status from time to time of certain sporting
                  events around which markets are offered on Vie.gg, and, on
                  occasion, of prior historical statistics relevant to such
                  events or markets. While such information is offered in good
                  faith, it is offered without any responsibility and Esports
                  Entertainment makes no claim as to the accuracy or otherwise
                  of any such information, and such information shall not be
                  relied upon.{" "}
                </li>
                <li>
                  Esports Entertainment reserves the right at any time to refuse
                  any wager or part of a wager without providing a reason or
                  advance notification. The circumstances in which a wager may
                  be refused include but are not limited to where the Member or
                  person placing the wager:
                </li>
              </ol>
              <ul>
                <li>is or may be less than 21 years of age;</li>
                <li>
                  is or may be betting on behalf of a person who is less than 21
                  years of age;
                </li>
                <li>is or may be in breach of any Terms and Conditions;</li>
                <li>is or may be in breach of any applicable law; or</li>
                <li>
                  proposes a wager which would present an unacceptable liability
                  risk to Esport Entertainment’s business.{" "}
                </li>
              </ul>
              <ol>
                <li>
                  Esports Entertainment reserves the right to close and/or
                  impose limits on a Member's Account (including limits on any
                  Esports Entertainment products that a Member may wish to bet
                  on) and refund the balance of their Account, without providing
                  any reason.
                </li>
                <li>
                  Wagers will only be accepted during the specific hours for the
                  market in which the wager is being placed. These betting hours
                  are subject to change and vary according to the market. Before
                  placing a wager, Members must ensure that they are familiar
                  with the betting hours for the specific market.
                </li>
                <li>
                  Esports Entertainment settles markets in accordance with the
                  official rules, statistics and results as declared by the
                  league’s governing body, unless specified otherwise in the
                  relevant <a href="/betting-rules">Betting Rules</a>.
                </li>
                <li>
                  Only wagers received and processed by our servers will be
                  valid. If for any reason a Member is disconnected from their
                  session, including, but not limited to, hardware failure,
                  telecommunication failure, internet failure or other, any
                  wagers not communicated due to disconnection will not be
                  placed, Esports Entertainment shall not be liable for any such
                  bet not being placed due to disconnection and the balance of
                  the Member’s Account will be as recorded on Esports
                  Entertainment’s servers.
                </li>
                <li>
                  When an event is cancelled, all related wagers will be void
                  automatically and a Member’s Account refunded.
                </li>
                <li>
                  When an event is postponed then all wagers will automatically
                  apply to the new time and date of that event, except that, in
                  the case that the event does not take place within forty-eight
                  (48) hours of the original scheduled time and date, all bets
                  will be refunded to the Member’s Account.
                </li>
                <li>
                  When an event is abandoned before a final result is
                  established, all wagers that have already been settled up
                  until the time of abandonment will stand, but all other wagers
                  in relation to that event will be void and the stake refunded
                  to the Member’s Account (subject to any sport-specific rules
                  in our <a href="/betting-rules">Betting Rules</a>
                  ).&nbsp;
                </li>
                <li>
                  In the event of a Member’s error when placing a wager, unless
                  prohibited by the Division of Gaming Enforcement (and provided
                  that the event has not started at the time), a Member can
                  request to void a validly placed wager by contacting Customer
                  Support. Voiding of a wager will be allowed up to fifteen (15)
                  minutes after the wager was placed. Cancellation or voiding of
                  wagers will be at Esports Entertainment's discretion and
                  Esports Entertainment reserves the right to deny a request for
                  any reason (subject to any regulatory requirements).
                </li>
                <li>
                  Except where expressly stated otherwise in these House Rules
                  or Terms and Conditions, wagers&nbsp;accepted will not be
                  changed or voided upon confirmation of the successfully
                  placed&nbsp;wager.
                </li>
                <li>
                  A prohibited sports pool participant, including an owner,
                  athlete, coach, referee, manager, handler, or athletic or
                  horse trainer, or any other person identified in N.J.A.C.
                  13:69N-1.1, shall not be permitted to wager on any event
                  governed by the league or sports governing body with which
                  they are affiliated. Any other employee of a sports governing
                  body, or one of its member teams, who is not a prohibited
                  sports pool participant, is required to register with the
                  Division of Gaming Enforcement prior to placing a wager.
                </li>
                <li>
                  Esports Entertainment reserves the right to add, change or
                  delete the House Rules, subject to any necessary regulatory
                  approval.
                </li>
                <li>
                  Rules relating to specific sports are set out in our{" "}
                  <a href="/betting-rules">Betting Rules</a>.
                </li>
              </ol>
              <p>
                <strong>Live Betting</strong>
              </p>
              <ol>
                <li>
                  ”Live Betting” is where it is possible to wager during an
                  ongoing game or event. Esports Entertainment does not
                  acknowledge or accept any liability whatsoever if it not
                  possible to place a wager or the live score update is not
                  correct.
                </li>
                <li>
                  At all times it is the Member’s responsibility to be aware of
                  the game and the events surrounding it such as the current
                  score, its progression and how much time remains before the
                  game is completed.
                </li>
                <li>
                  Esports Entertainment does not accept any liability for
                  changes to the Live Betting schedule or interruption of the
                  Live Betting service.
                </li>
                <li>
                  Live Betting may only be available on certain markets and for
                  short periods of time.
                </li>
                <li>
                  Unless otherwise stated, the{" "}
                  <a href="/betting-rules">Betting Rules</a> apply to all wagers
                  placed in Live Betting.
                </li>
              </ol>
            </>
          }
        />
      </>
    </>
  );
}

BettingRules.namespacesRequired = [...defaultNamespaces, "page-betting-rules"];

export default BettingRules;
