import Head from "next/head";
import { defaultNamespaces } from "../defaults";
import { useTranslation } from "i18n";
import { Content } from "./index.styled";
import { StaticContentBlock } from "../../static-page";

function ResponsibleGaming() {
  const { t } = useTranslation(["responsible-gaming"]);

  return (
    <>
      <Head>
        <title>{t("TITLE")}</title>
      </Head>

      <StaticContentBlock
        title={t("TITLE")}
        content={
          <Content>
            <p>
              <strong>RESPONSIBLE GAMING PROCESS</strong>
            </p>
            <ul>
              <li>
                If you or someone you know is experiencing any of the signs of
                problem gambling then you are not alone. The problem gambling
                hotline is available to both the gambler and those affected 24
                hours a day, 7 days a week to answer your questions and offer
                confidential assistance Call 1-800-GAMBLER
              </li>
              <li>
                For the vast majority of people gambling is a form of
                entertainment, like going to a show or out to dinner; these
                individuals can gamble without harmful effects. However, there
                is a small percentage of gamblers for whom the activity becomes
                problematic or even uncontrollable.
              </li>
              <li>
                Individuals who enjoy gambling as a social pastime game
                responsibly by knowing their limits; they are able to stop when
                they want to. There are other individuals who can’t control
                their urge to gamble – even when the consequences negatively
                affect their finances, their lives and their family.
              </li>
              <li>
                This is problem gambling. Problem gambling is an addiction –
                like alcoholism or drug abuse. As with other addictions, an
                addiction to gambling requires the individual suffering from the
                addiction to take personal responsibility.
              </li>
              <li>
                It isn’t possible to predict who will develop a gambling
                addiction. There is no “typical” problem gambler; it can happen
                to anyone. Gambling addiction occurs with people of every race,
                sex, age, religion, and socio-economic group.
              </li>
            </ul>
            <p>
              <strong>
                Warning signs of problem gambling can include any of the
                following:
              </strong>
            </p>
            <ul>
              <li>Losing time from work, school, or family due to gambling</li>
              <li>Repeated failed attempts to stop or control the gambling</li>
              <li>Borrowing money to gamble or pay gambling debts</li>
              <li>Gambling to escape worry or trouble</li>
              <li>
                Neglecting the care of one’s self or family in order to gamble
              </li>
              <li>
                Lying about the amount of time and money spent on gambling
              </li>
              <li>Gambling more money in an attempt to win back losses</li>
              <li>
                Selling or pawning personal possessions to get money to gamble
              </li>
              <li>
                Feelings of hopelessness, depression, or suicide as a result of
                gambling
              </li>
            </ul>
            <p>
              <strong>Identify and Reduce the Risks</strong>
            </p>
            <ul>
              <li>
                If you choose to play online, there are some general guidelines
                that can help make your playing experience safer, and reduce the
                risk of problems occurring:
              </li>
              <li>
                If you choose to gamble, do so for entertainment purposes. If
                your gambling is no longer an enjoyable activity, then ask
                yourself why you are still “playing”.
              </li>
              <li>
                Treat the money you lose as the cost of your entertainment.
                Treat any winnings as a bonus.
              </li>
              <li>
                Set a dollar limit and stick to it. Decide how much of your
                budget you want to allow for gambling. Leave when you reach your
                budget limit whether you are winning or losing.
              </li>
              <li>
                Set a time limit and stick to it. Decide how much of your time
                you want to allow for gambling. Leave when you reach the time
                limit whether you are winning or losing.
              </li>
              <li>Expect to lose. The odds are that you will lose.</li>
              <li>
                Make it a private rule not to gamble on credit. Do not borrow
                money to gamble.
              </li>
              <li>
                Create a balance in your life. Gambling should not interfere
                with or substitute for friends, family, work or other worthwhile
                activities.
              </li>
              <li>
                Avoid “chasing” lost money. Chances are the more you try to
                recoup your losses the large your losses will be.
              </li>
              <li>
                Don’t gamble as a way to cope with emotional or physical pain.
                Gambling for reasons other than entertainment can lead to
                problems.
              </li>
              <li>
                Become educated about the warning signs of problem gambling. The
                more you know, the better choices you can make.
              </li>
              <li>
                For information regarding the risks associated with gambling,
                please visit&nbsp;<a href="https://800gambler.org/">here</a>.
              </li>
              <li>
                There are resources for problem gambling, as well as,
                self-limiting and self-exclusion on your account.
              </li>
            </ul>
            <p>
              <strong>Resources</strong>
            </p>
            <p>
              The below resources are available to answer your questions and
              offer confidential assistance. You can talk to caring and
              knowledgeable counsellors who will provide information on
              available treatment and support resources in your area.
            </p>
            <ul>
              <li>
                Problem Gambling Hotline: Call or Text
                1-800-522-4700,&nbsp;www.ncpgambling.org
              </li>
              <li>
                Council on Compulsive Gambling of New Jersey: Call
                1-800-GAMBLER,&nbsp;800gambler.org
              </li>
              <li>
                National Centre for Responsible Gaming: Call
                978-338-6610,&nbsp;www.ncrg.org
              </li>
            </ul>
            <p>
              <strong>ACCOUNT INFORMATION</strong>
            </p>
            <ul>
              <li>
                Account holders will receive a pop-up notification when their
                lifetime deposits exceed $2,500:
              </li>
              <li>
                You have met the Division’s gaming deposit threshold of $2,500
              </li>
              <li>
                You have the capability to establish responsible gaming limits
                or close your account
              </li>
              <li>1-800-GAMBLER is available for assistance</li>
              <li>
                The account holder must acknowledge this notification before any
                further wagering is permitted. Thereafter, account holders will
                receive an annual notification that must be acknowledged upon
                meeting the threshold within subsequent years.
              </li>
            </ul>
            <p>
              <strong>Ways to Self-Limit</strong>
            </p>
            <ul>
              <li>
                Playing on VIE.GG should be a fun interaction and a great way to
                enhance your sports viewing experience. There are several ways
                to game responsibly which includes making personal choices
                involving your self-imposed responsible gaming limits. You can
                choose to set a cooling-off period or limit the amount of time
                you play per day, week or month and limit your deposit amount,
                and/or the amount wagered per day, week, or month.
              </li>
              <li>
                To set or adjust your self-imposed responsible gaming limit
                choices, please go to the Responsible Gambling section and
                follow the prompts. Initial self-limits and decreases in your
                self- limits will take effect immediately. Any increase to your
                limits shall become effective at 00:00 on the next day for daily
                limits; the next Monday for weekly limits and the first day of
                the next calendar month for monthly limits.
              </li>
            </ul>
            <p>
              <a href="/account/responsible-gaming">
                <strong>Cooling Off Period</strong>
              </a>
            </p>
            <ul>
              <li>
                You may set a cooling off period for 72 hours to 28 days which
                will suspend your ability to conduct certain transactions on
                your account, including making wagers, participating in
                promotional offers, depositing funds, or increasing your
                self-imposed limits. To withdraw funds from your account during
                your cooling off period, please contact our customer support
                team&nbsp;help@vie.gg Once you have set your cooling off period
                you cannot remove it; after the duration of the selected cooling
                off period has expired the system will automatically reactivate
                your account, allowing you to conduct transactions again. Upon
                selecting a cooling off period, you will receive an email
                notification of the suspension. You will not receive any
                promotional offers or push notifications during your set cooling
                off period.
              </li>
            </ul>
            <p>
              <a href="/account/responsible-gaming">
                <strong>Time Limits</strong>
              </a>
            </p>
            <ul>
              <li>
                You may set a time limit on your account which sets a maximum
                time spent gaming in a single day, week or month, measured
                hourly from your login. When you have reached your maximum time
                limit amount you will no longer be able to wager until the time
                frame you specified has elapsed.
              </li>
            </ul>
            <p>
              <a href="/account/responsible-gaming">
                <strong>Deposit Limits</strong>
              </a>
            </p>
            <ul>
              <li>
                You may set a deposit limit which limits the amount of funds you
                can deposit into your account during a specified timeframe (i.e.
                day, week, or month). When you have reached your maximum deposit
                amount you will no longer be able to make deposits until the
                time frame you specified has elapsed.
              </li>
            </ul>
            <p>
              <a href="about:blank">
                <strong>Spending Limits</strong>
              </a>
            </p>
            <ul>
              <li>
                You may set a spending limit which limits the amount of funds
                that can be wagered during play for a specified timeframe (i.e.,
                day, week, or month). By setting your spending limits you get to
                choose the maximum amount you put at risk during a particular
                time period. When you have reached your maximum spending limit,
                you will no longer be able to wager until the timeframe you
                specified has elapsed.
              </li>
            </ul>
            <p>
              <a href="/account/responsible-gaming">
                <strong>Self-Exclusion</strong>
              </a>
            </p>
            <ul>
              <li>
                You have the option to self-exclude and select the minimum
                length of time you want your name to appear on the New Jersey
                Self-Exclusion List: one year or five years on the VIE.GG or
                lifetime (only in person). You cannot be removed from the
                Self-Exclusion List until after the specified period of time has
                passed and you appear in person at the New Jersey Division of
                Gaming (“Division of Gaming”) Offices and request your removal
                from the Self-Exclusion list.
              </li>
              <li>
                By self-excluding in New Jersey, the Company will share this
                information with its existing (or future) U.S. affiliates
                (collectively, “VIE”) and exclude you at any gaming operation
                run by VIE.GG. The ultimate responsibility to limit your access
                to VIE.GG account and its services remains yours alone, and Wynn
                is not liable for any act or omission in processing or
                attempting to comply with your request for self-exclusion,
                including any failure to withhold your gaming privileges.
              </li>
              <li>
                Details for submitting your Self-Exclusion application can be
                found&nbsp;
                <a href="https://www.njportal.com/dge/selfexclusion">here</a>.
              </li>
            </ul>
            <p>
              <strong>Closing Your Account</strong>
            </p>
            <ul>
              <li>
                If you would like to close your VIE.GG account, this can be done
                by contacting our Customer Support team, who are available by
                phone, live chat and&nbsp;
                <a href="mailto:help@vie.gg?subject=Close%20my%20account">
                  email
                </a>
                .&nbsp;
              </li>
            </ul>
            <p>
              <strong>
                Be aware of common myths about compulsive gambling
              </strong>
            </p>
            <ul>
              <li>
                We believe gambling should be done for fun and entertainment.
                But some customers who engage in recreational gambling do not
                believe they could become addicted, and sometimes hold onto
                false beliefs or myths about problem gambling that can lead to
                denial and other problems. Some of the more common myths are
                listed below.
              </li>
              <li>Myth:&nbsp;A compulsive gambler gambles every day</li>
              <li>
                Fact:&nbsp;A problem gambler may gamble frequently or
                infrequently. If a person’s gambling is causing psychological,
                financial, emotional, marital, legal or other consequences for
                themselves and the people around them, then they could be
                displaying signs of a gambling problem.
              </li>
              <li>
                Myth:&nbsp;A compulsive gambler will bet on anything and gamble
                at any opportunity on any form of gambling.
              </li>
              <li>
                Fact:&nbsp;Most problem gamblers have a favourite form of
                gambling that causes them problems and are not likely to be
                tempted by betting on other things. For example, a gambler who
                makes weekly trips to the race track may not be tempted by
                lottery tickets or slot machines. Some compulsive gamblers also
                engage in secondary forms of gambling, but these are not usually
                as problematic.
              </li>
              <li>
                Myth:&nbsp;Gambling only becomes a problem when you lose every
                penny. Compulsive gambling is just a financial problem.
              </li>
              <li>
                Fact:&nbsp;How much money you win or lose does not determine if
                you have a gambling addiction. Compulsive gamblers may win big
                and then lose all their earnings the next day, or they may only
                bet a certain amount each time. Typically, those with gambling
                problems will incur enough debt that the financial consequences
                of their behaviour begins impacting their lives, but that is not
                always the case.
              </li>
              <li>
                Myth:&nbsp;It’s not possible to become addicted to something
                like gambling.
              </li>
              <li>
                Fact:&nbsp;Certain activities, such as gambling, can be just as
                addictive as drinking or doing drugs. Gambling may produce a
                euphoria that encourages a compulsive gambler to keep repeating
                the behavior to achieve that effect. As with drugs and alcohol,
                a gambling addict may develop a tolerance for gambling and take
                bigger and bigger risks to achieve that euphoria. A compulsive
                gambler will give in to a craving for gambling by doing it more
                often, regardless of the negative consequences. As with any
                other addictions and compulsive behavior, pathological gamblers
                may also be in denial about their behaviour, and may not believe
                they have a problem at all.
              </li>
              <li>
                Myth:&nbsp;Only irresponsible people become addicted to
                gambling.
              </li>
              <li>
                Fact:&nbsp;Many problem gamblers hold, or have held, responsible
                community positions. In addition, even people with a long
                history of responsible behaviour are vulnerable to developing a
                gambling problem. It is common for people to believe that those
                suffering from addictions are weak-willed and irresponsible. But
                anybody can become addicted to gambling, no matter how
                responsible they are.
              </li>
              <li>
                Myth:&nbsp;Compulsive gambling isn’t really a problem if the
                gambler can afford it.
              </li>
              <li>
                Fact:&nbsp;Problems caused by excessive gambling are not just
                financial. If a person’s gambling is interfering with their
                ability to act in accordance with their values, then there is a
                problem. For example, too much time spent on gambling means less
                time to spend with family, friends and others. It can lead to
                relationship breakdown and loss of important friendships.
              </li>
              <li>Myth:&nbsp;It’s easy to recognize a compulsive gambler.</li>
              <li>
                Fact:&nbsp;Problem gambling has been called the hidden
                addiction. It is very easy to hide as it has few recognizable
                symptoms, unlike alcohol and drug use. Many problem gamblers
                themselves do not recognize they have a gambling problem.
                Problem gamblers often engage in self-denial.
              </li>
              <li>
                Myth:&nbsp;If I keep gambling, my luck will change and I'll win
                back the money I've lost.
              </li>
              <li>
                Fact:&nbsp;Each time you place a bet, the outcome is completely
                independent of the previous bet. This means that the odds are no
                more in your favor on the tenth bet than they were on the first
                bet. Risking more, or playing longer, will not improve your
                chances of winning.
              </li>
              <li>
                Myth:&nbsp;I have a feeling that today is my lucky day. I just
                know I’m going to win.
              </li>
              <li>
                Fact:&nbsp;Hoping, wishing, or even needing to win money has
                absolutely no influence on the outcome of a game of chance.
              </li>
              <li>
                If any of these myths are realities for you or a loved one, it
                may be necessary to consider seeking treatment for a gambling
                addiction.&nbsp;If you or someone you know has a gambling
                problem and wants help, call 1-800-Gambler.
              </li>
            </ul>
          </Content>
        }
      />

      <StaticContentBlock
        title={t("PATRON_PROTECTION_TITLE")}
        content={
          <Content>
            <p>
              <strong>Underage gambling:</strong>
            </p>
            <p>
              Underage gambling is a criminal offense and any person who
              facilitates someone under the age of 21 to gamble has committed a
              criminal offense and shall be prohibited from Internet gaming.
            </p>
            <p>
              VIE excludes minors (persons under the age of 21) from gaming, so
              we will always ask for proof of age during the registration
              process. During registration, your social security number will
              need to be included on the registration form, which will be
              automatically verified by us, along with other information you
              provide. If there is an issue with the initial verification
              process, you will be required to provide your qualifying picture
              ID and your utility bill for further verification.
            </p>
            <p>
              If you know someone under the age of 21 who is registered with us,
              please contact us immediately at&nbsp;help@vie.gg
            </p>
            <p>
              <strong>Use of our website “VIE.NJ</strong> “:
            </p>
            <p>
              Federal Law prohibits and restricts wagering on the Internet
              (including, but not limited to, such prohibitions and restrictions
              set out in 18 U.S.C. §§ 1084 et seq. (‘The Wire Act’) and 31
              U.S.C. §§ 5361 through 5367 (‘UIGEA’)).&nbsp;&nbsp;It is a Federal
              offense for persons physically located outside of New Jersey to
              engage in Internet wagering through a New Jersey casino.
            </p>
            <p>
              Real-money gaming on the Platforms is restricted by the New Jersey
              Division of Gaming Enforcement to users who are physically located
              within the state of New Jersey. To confirm your desktop/laptop
              location, we use a third-party method using IP address and Wi-Fi
              signal. If one of the two is not confirmed, you will not be
              allowed to use the Services. To confirm your mobile device
              location, we use a third-party method using carrier cell tower and
              Wi-Fi signal. If your mobile device location is not confirmed, you
              will not be allowed to use the Services. We cannot guarantee that
              your device will be able to successfully use the location
              services. If we or our third-party providers are unable to
              precisely track your location for any reason, you may be prevented
              from accessing or using the Services. We are not liable for your
              inability to access or use the Services.
            </p>
            <p>
              By registering to use the Services, you consent to the monitoring
              and recording by us (or our service providers) and/or by the New
              Jersey Division of Gaming Enforcement of any wagering
              communications and geographic location information for the purpose
              of determining compliance with the Act.
            </p>
            <p>
              We will handle all information collected through the location
              services in accordance with our Privacy Policy. If you have any
              questions or concerns regarding the location services, you may
              contact us at&nbsp;help@vie.gg&nbsp;or at +1 (855) 944-3578.
            </p>
            <p>
              Full Terms of Service can be found&nbsp;
              <a href="/terms-and-conditions">here</a>
            </p>
            <p>
              <strong>Account History &amp; Security:</strong>
            </p>
            <p>
              Account Safety and Sharing<strong>&nbsp;</strong>– Your email
              address and password created on account registration should not be
              shared with anyone. As an approved player, you are explicitly
              prohibited from allowing others access to your account. You are
              solely responsible for the security of your email address&nbsp;and
              password, and all activities that occur under your account.
            </p>
            <p>
              If you suspect someone has gained unauthorized access to your
              account, notify us by email at&nbsp;help@vie.gg
            </p>
            <p>
              Auto-lock<strong> -</strong>&nbsp;You are responsible for
              maintaining the confidentiality of your email address&nbsp;and
              password and for restricting access to your remote wagering
              account, including utilizing device screen-locking features to
              protect from unauthorized use.
            </p>
            <p>
              2-Factor Authentication&nbsp;– It is recommended you enable
              2-Factor Authentication (“2FA”) as an added layer of security for
              your account. After logging in, from ‘My Account’ select the
              ‘Security Settings’ link, from which you’ll be able to switch on
              2FA.
            </p>
            <p>
              Forgotten password&nbsp;- There is a forgotten password link on
              the login prompt. By entering your email address, an email will be
              sent to your registered email address with steps to reset your
              password.
            </p>
            <p>
              How to change your password&nbsp;– From ‘My Account’ click on your
              name to see further account details. In here you will see the
              option to click ‘Change Password’.
            </p>
            <p>
              Account history<strong> –&nbsp;</strong>After logging in, from ‘My
              Account’, selecting ‘My Transactions’ will give a list of all
              wagers, deposits and withdrawals on your account from the last 6
              months. For information on wagers placed over 6 months ago, you
              may contact us at&nbsp;help@vie.gg or at +1 (855) 944-3578
            </p>
            <p>
              Closing my account&nbsp;– To close your account, please contact us
              at&nbsp;help@vie.gg&nbsp;&nbsp;or at +1 (855) 944-3578
            </p>
            <p>
              Accessing Terms and Conditions on Registration&nbsp;– To access
              VIE’s terms and conditions upon registering, click the hyperlink
              to the terms and conditions about the bottom of the registration
              page.
            </p>
            <p>
              <strong>Disputes</strong>
            </p>
            <p>
              Stage 1<strong> -&nbsp;</strong>You can contact us at any time to
              register a complaint, and our friendly staff will be happy to try
              and resolve the situation for you.&nbsp;&nbsp;You can contact us
              via phone, email or live chat at&nbsp;help@vie.gg &nbsp;or +1
              (855) 944-3578. Please note that it can take up to 72 hours for us
              to respond to your complaint.
            </p>
            <p>
              Stage 2&nbsp;– If you are not satisfied that your complaint has
              been resolved, you can escalate by contacting Vie's Customer
              Support Manager at&nbsp;help@vie.gg
            </p>
            <p>Your email should have the following information included:</p>
            <ul>
              <li>First and last name</li>
              <li>
                Description of what has happened and details of any
                communication with the Customer Support team
              </li>
              <li>Your contact details</li>
            </ul>
            <p>
              We will review your complaint and respond to the email address
              that we have on file within five working days, to let you know our
              final response.
            </p>
            <p>
              If you are not satisfied with our final response, you can contact
              the Complaints Manager or the Managing Director’s Office of the
              Division of Gaming Enforcement.
            </p>
            <p>
              You can e-mail a complaint to the Division:&nbsp;
              <a href="mailto:Igaming@njdge.org">Igaming@njdge.org</a>&nbsp;or
              click&nbsp;
              <a href="https://www.nj.gov/oag/ge/docs/InternetGaming/IgamingDisputeForm.pdf">
                here
              </a>
              &nbsp;to submit a dispute online.
            </p>
            <p>
              You may contact the Division of Gaming Enforcement by calling
              (609) 984-0909.
            </p>
          </Content>
        }
      />
    </>
  );
}

ResponsibleGaming.namespacesRequired = [
  ...defaultNamespaces,
  "responsible-gaming",
];

export default ResponsibleGaming;
