package phoenix.softplay.application

import scala.concurrent.Future

import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterDataGenerator.generatePunter
import phoenix.punters.cooloff.PunterCoolOff
import phoenix.punters.cooloff.PunterCoolOffRepository
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.LimitChange
import phoenix.punters.domain.LimitPeriodType.Day
import phoenix.punters.domain.LimitPeriodType.Month
import phoenix.punters.domain.LimitPeriodType.Week
import phoenix.punters.domain.RegistrationOutcome
import phoenix.punters.domain.ResponsibleGamblingLimitType.DepositAmount
import phoenix.punters.domain.ResponsibleGamblingLimitType.StakeAmount
import phoenix.punters.exclusion.infrastructure.SlickSelfExcludedPuntersRepository
import phoenix.punters.exclusion.support.ExclusionDataGenerator.generateSelfExcludedPunter
import phoenix.punters.infrastructure.SlickPunterLimitsHistoryRepository
import phoenix.punters.infrastructure.SlickPuntersRepository
import phoenix.softplay.domain._
import phoenix.softplay.infrastructure.SlickSoftPlayRepository
import phoenix.support._
import phoenix.time.FakeHardcodedClock
import phoenix.utils.cryptography.EncryptionPassword

class CreateSoftPlayReportSpec
    extends AnyWordSpecLike
    with GivenWhenThen
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with KeycloakIntegrationSpec {

  private implicit val clock = new FakeHardcodedClock()

  private val punterDataRepository =
    new SlickPuntersRepository(dbConfig, EncryptionPassword("foobar"), _ => Future.successful(None))
  private val punterLimitsHistoryRepository = new SlickPunterLimitsHistoryRepository(dbConfig)
  private val punterCoolOffRepository = new PunterCoolOffRepository(dbConfig)
  private val softPlayRepository = new SlickSoftPlayRepository(dbConfig)
  private val selfExcludedRepository = new SlickSelfExcludedPuntersRepository(dbConfig)
  private val createSoftPlayReport = new CreateSoftPlayReport(softPlayRepository)

  "CreateSoftPlayReport" should {

    "create an accurate report" in {

      val now = clock.currentOffsetDateTime()

      Given("punters registered via test user registration route")
      awaitRight(punterDataRepository.register(generatePunter(), now.minusMonths(1)))
      awaitRight(punterDataRepository.register(generatePunter(), now.minusSeconds(1)))
      awaitRight(punterDataRepository.register(generatePunter(), now))
      awaitRight(punterDataRepository.register(generatePunter(), now.plusSeconds(1)))
      awaitRight(punterDataRepository.register(generatePunter(), now.plusYears(1)))

      And("a successfully registered punter")
      val successfulPunter = generatePunter()
      awaitRight(punterDataRepository.startPunterRegistration(successfulPunter, now))
      awaitRight(
        punterDataRepository
          .markRegistrationFinished(successfulPunter.punterId, RegistrationOutcome.Successful, now.minusSeconds(1)))

      And("unsuccessfully registered punters")
      val unsuccessfulPunter1 = generatePunter()
      awaitRight(punterDataRepository.startPunterRegistration(unsuccessfulPunter1, now))
      awaitRight(
        punterDataRepository
          .markRegistrationFinished(unsuccessfulPunter1.punterId, RegistrationOutcome.Failed, now.minusSeconds(1)))

      val unsuccessfulPunter2 = generatePunter()
      awaitRight(punterDataRepository.startPunterRegistration(unsuccessfulPunter2, now))
      awaitRight(
        punterDataRepository.markRegistrationFinished(unsuccessfulPunter2.punterId, RegistrationOutcome.Failed, now))

      And("punter with unfinished registration processes")
      awaitRight(punterDataRepository.startPunterRegistration(generatePunter(), now.minusSeconds(1)))

      val lessThanOneDayAgo = now.minusDays(1).plusSeconds(1)
      val lessThanOneWeekAgo = now.minusWeeks(1).plusSeconds(1)
      val lessThanOneMonthAgo = now.minusMonths(1).plusSeconds(1)
      val aYearAgo = now.minusYears(1)
      val lessThanAYearAGo = aYearAgo.plusSeconds(1)
      val aDayFromNow = now.plusDays(1)

      And("punters with deposit limits")
      val punter1 = generatePunterId()
      // effective less than a day from now - should be counted
      punterLimitsHistoryRepository.insert(
        LimitChange(punter1, DepositAmount, Day, "100.00USD", lessThanOneDayAgo, now))

      // effective less than a week from now - should be counted
      punterLimitsHistoryRepository.insert(
        LimitChange(punter1, DepositAmount, Week, "100.00USD", lessThanOneWeekAgo, now))

      // effective less than a month from now - should be counted
      punterLimitsHistoryRepository.insert(
        LimitChange(punter1, DepositAmount, Month, "100.00USD", lessThanOneMonthAgo, now))

      val punter2 = generatePunterId()
      // effective a year ago and nothing since - should be counted
      punterLimitsHistoryRepository.insert(LimitChange(punter2, DepositAmount, Day, "100.00USD", aYearAgo, now))

      // effective a year ago and nothing since - should be counted
      punterLimitsHistoryRepository.insert(LimitChange(punter2, DepositAmount, Week, "100.00USD", aYearAgo, now))

      // effective a year ago and nothing since - should be counted
      punterLimitsHistoryRepository.insert(LimitChange(punter2, DepositAmount, Month, "100.00USD", aYearAgo, now))

      val punter3 = generatePunterId()
      // effective a year ago and removed since - should be counted
      punterLimitsHistoryRepository.insert(LimitChange(punter3, DepositAmount, Day, "100.00USD", aYearAgo, now))
      punterLimitsHistoryRepository.insert(LimitChange(punter3, DepositAmount, Day, "REMOVED", lessThanAYearAGo, now))

      // effective a year ago and removed since - should be counted
      punterLimitsHistoryRepository.insert(LimitChange(punter3, DepositAmount, Week, "100.00USD", aYearAgo, now))
      punterLimitsHistoryRepository.insert(LimitChange(punter3, DepositAmount, Week, "REMOVED", lessThanAYearAGo, now))

      // effective a year ago and removed since - should be counted
      punterLimitsHistoryRepository.insert(LimitChange(punter3, DepositAmount, Month, "100.00USD", aYearAgo, now))
      punterLimitsHistoryRepository.insert(LimitChange(punter3, DepositAmount, Month, "REMOVED", lessThanAYearAGo, now))

      // effective in the future - should NOT be counted
      punterLimitsHistoryRepository.insert(
        LimitChange(generatePunterId(), DepositAmount, Day, "100.00USD", aDayFromNow, now))

      // effective in the future - should NOT be counted
      punterLimitsHistoryRepository.insert(
        LimitChange(generatePunterId(), DepositAmount, Week, "100.00USD", aDayFromNow, now))

      // effective in the future - should NOT be counted
      punterLimitsHistoryRepository.insert(
        LimitChange(generatePunterId(), DepositAmount, Month, "100.00USD", aDayFromNow, now))

      val punter4 = generatePunterId()

      // Punter #4 sets a limit for two different periods but then removes just one, this leaves the
      // `REMOVED` limit as the most recent which is a situation that needs an explicit test.
      punterLimitsHistoryRepository.insert(LimitChange(punter4, DepositAmount, Day, "100.00USD", aYearAgo, now))
      punterLimitsHistoryRepository.insert(LimitChange(punter4, DepositAmount, Week, "100.00USD", aYearAgo, now))
      punterLimitsHistoryRepository.insert(LimitChange(punter4, DepositAmount, Day, "REMOVED", lessThanAYearAGo, now))

      And("punters with stake limits")
      // effective less than a day from now - should be counted
      punterLimitsHistoryRepository.insert(LimitChange(punter1, StakeAmount, Day, "100.00USD", lessThanOneDayAgo, now))

      // effective less than a week from now - should be counted
      punterLimitsHistoryRepository.insert(
        LimitChange(punter1, StakeAmount, Week, "100.00USD", lessThanOneWeekAgo, now))

      // effective less than a month from now - should be counted
      punterLimitsHistoryRepository.insert(
        LimitChange(punter1, StakeAmount, Month, "100.00USD", lessThanOneMonthAgo, now))

      // effective a year ago and nothing since - should be counted
      punterLimitsHistoryRepository.insert(LimitChange(punter2, StakeAmount, Day, "100.00USD", aYearAgo, now))

      // effective a year ago and nothing since - should be counted
      punterLimitsHistoryRepository.insert(LimitChange(punter2, StakeAmount, Week, "100.00USD", aYearAgo, now))

      // effective a year ago and nothing since - should be counted
      punterLimitsHistoryRepository.insert(LimitChange(punter2, StakeAmount, Month, "100.00USD", aYearAgo, now))

      // effective a year ago and removed since - should be counted
      punterLimitsHistoryRepository.insert(LimitChange(punter3, StakeAmount, Day, "100.00USD", aYearAgo, now))
      punterLimitsHistoryRepository.insert(LimitChange(punter3, StakeAmount, Day, "REMOVED", lessThanAYearAGo, now))

      // effective a year ago and removed since - should be counted
      punterLimitsHistoryRepository.insert(LimitChange(punter3, StakeAmount, Week, "100.00USD", aYearAgo, now))
      punterLimitsHistoryRepository.insert(LimitChange(punter3, StakeAmount, Week, "REMOVED", lessThanAYearAGo, now))

      // effective a year ago and removed since - should be counted
      punterLimitsHistoryRepository.insert(LimitChange(punter3, StakeAmount, Month, "100.00USD", aYearAgo, now))
      punterLimitsHistoryRepository.insert(LimitChange(punter3, StakeAmount, Month, "REMOVED", lessThanAYearAGo, now))

      // effective in the future - should NOT be counted
      punterLimitsHistoryRepository.insert(
        LimitChange(generatePunterId(), StakeAmount, Day, "100.00USD", aDayFromNow, now))

      // effective in the future - should NOT be counted
      punterLimitsHistoryRepository.insert(
        LimitChange(generatePunterId(), StakeAmount, Week, "100.00USD", aDayFromNow, now))

      // effective in the future - should NOT be counted
      punterLimitsHistoryRepository.insert(
        LimitChange(generatePunterId(), StakeAmount, Month, "100.00USD", aDayFromNow, now))

      // Punter #4 sets a limit for two different periods but then removes just one, this leaves the
      // `REMOVED` limit as the most recent which is a situation that needs an explicit test.
      punterLimitsHistoryRepository.insert(LimitChange(punter4, StakeAmount, Day, "100.00USD", aYearAgo, now))
      punterLimitsHistoryRepository.insert(LimitChange(punter4, StakeAmount, Week, "100.00USD", aYearAgo, now))
      punterLimitsHistoryRepository.insert(LimitChange(punter4, StakeAmount, Day, "REMOVED", lessThanAYearAGo, now))

      And("with punters in self-initiated cool-off")
      punterCoolOffRepository.save(
        PunterCoolOff(generatePunterId(), now.minusDays(1), now.minusSeconds(1), CoolOffCause.SelfInitiated))
      punterCoolOffRepository.save(
        PunterCoolOff(generatePunterId(), now.minusDays(1), now.plusSeconds(1), CoolOffCause.SelfInitiated))
      punterCoolOffRepository.save(
        PunterCoolOff(generatePunterId(), now.plusSeconds(1), now.plusDays(1), CoolOffCause.SelfInitiated))

      And("with punters in cool-off due to breaching session limits")
      punterCoolOffRepository.save(
        PunterCoolOff(generatePunterId(), now.minusDays(1), now.minusSeconds(1), CoolOffCause.SessionLimitBreach))
      punterCoolOffRepository.save(
        PunterCoolOff(generatePunterId(), now.minusDays(1), now.plusSeconds(1), CoolOffCause.SessionLimitBreach))
      punterCoolOffRepository.save(
        PunterCoolOff(generatePunterId(), now.plusSeconds(1), now.plusDays(1), CoolOffCause.SessionLimitBreach))

      And("punter is self excluded")
      await(selfExcludedRepository.upsert(generateSelfExcludedPunter()))
      await(selfExcludedRepository.upsert(generateSelfExcludedPunter().copy(excludedAt = now.plusSeconds(2))))

      val expectedSoftPlayReport = SoftPlayReport(
        SuccessfulRegistrationsCount(3),
        UnsuccessfulRegistrationsCount(2),
        PuntersWithDepositLimitCount(4),
        PuntersWithSpendLimitCount(4),
        ExcludedPuntersCount(1),
        SuspendedPuntersCount(1))

      When("the Soft Play report is generated")
      val returnedReport = await(createSoftPlayReport.createReport(now))

      Then("the report is accurate")
      returnedReport shouldBe expectedSoftPlayReport
    }
  }
}
