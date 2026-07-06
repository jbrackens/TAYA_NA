package phoenix.punters.exclusion.unit

import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.support.MemorizedBetsBoundedContext
import phoenix.boundedcontexts.punter.MemorizedTestPuntersContext
import phoenix.core.Clock
import phoenix.punters.PunterDataGenerator.generateRegisteredUser
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterState.SelfExclusionOrigin
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.LastName
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.exclusion.application.IngestExcludedPlayersReport
import phoenix.punters.exclusion.domain.ExclusionStatus
import phoenix.punters.exclusion.support.ExclusionDataGenerator.generateExcludedPlayer
import phoenix.punters.exclusion.support.ExclusionDataGenerator.generateExclusion
import phoenix.punters.exclusion.support.ExclusionDataGenerator.generateName
import phoenix.punters.exclusion.support.InMemoryExcludedPlayersFeed
import phoenix.punters.exclusion.support.InMemoryExcludedPlayersRepository
import phoenix.punters.idcomply.support.RegistrationDataGenerator.generateFullSSN
import phoenix.punters.support.InMemoryPuntersRepository
import phoenix.punters.support.PunterConverters.createPunter
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.support.UserGenerator.generatePersonalName
import phoenix.time.FakeHardcodedClock

final class IngestExcludedPlayersReportSpec
    extends AnyWordSpec
    with Matchers
    with FutureSupport
    with GivenWhenThen
    with ActorSystemIntegrationSpec {

  private implicit val clock: Clock = new FakeHardcodedClock()

  "it should insert the new data and update the data of already existing punters" in {
    Given("a report user with full SSN, which is found by full SSN in our system")
    val ssnOfReportUserWithFullSSNFound = generateFullSSN()
    val reportUserFullSSNFound = generateExcludedPlayer()
      .copy(ssn = Some(Right(ssnOfReportUserWithFullSSNFound)))
      .copy(exclusion = generateExclusion(ExclusionStatus.Active))
    val registeredUserMatchingUserFullSSNFound = generateRegisteredUser()

    Given("a report user with full SSN, which won't be found in our system")
    val reportUserFullSSNNotFound = generateExcludedPlayer().copy(ssn = Some(Right(generateFullSSN())))

    Given(
      "a report user with partial SSN, matching in our system because a user with same DoB and matching last 4 digits of SSN exists")
    val ssnOfReportUserPartialSSNFound = generateFullSSN()
    val reportUserPartialSSNFound = generateExcludedPlayer()
      .copy(ssn = Some(Left(Last4DigitsOfSSN(ssnOfReportUserPartialSSNFound.value.takeRight(4)))))
      .copy(exclusion = generateExclusion(ExclusionStatus.Removed))
    val registeredUserMatchingUserPartialSSNFound = generateRegisteredUser().withDetails(
      _.copy(dateOfBirth = DateOfBirth.unsafeFrom(reportUserPartialSSNFound.dateOfBirth)))

    Given(
      "a report user with partial SSN, NOT matching in our system even if a user with same DoB exists, as the last 4 digits of SSN do not match")
    val ssnOfReportUserPartialSSNNotFound = FullSSN.fromString("129849816").unsafe()
    val reportUserPartialSSNNotFoundBecauseNotMatchingSSN =
      generateExcludedPlayer().copy(ssn = Some(Left(Last4DigitsOfSSN("2816"))))
    val registeredUserMatchingUserPartialSSNNotFound = generateRegisteredUser().withDetails(
      _.copy(dateOfBirth = DateOfBirth.unsafeFrom(reportUserPartialSSNNotFoundBecauseNotMatchingSSN.dateOfBirth)))

    Given("a report user with partial SSN, NOT matching in our system because user with same DoB doesn't exist")
    val reportUserPartialSSNNotFoundBecauseNotMatchingDoB =
      generateExcludedPlayer().copy(ssn = Some(Left(Last4DigitsOfSSN("7777"))))

    Given("a report user without SSN, matching in our system because a user with same DoB and same last name exists")
    val reportUserNoSSNFoundBecauseSameDOBAndSameLastName =
      generateExcludedPlayer().copy(ssn = None).copy(exclusion = generateExclusion(ExclusionStatus.Active))
    val registeredUserMatchingUserNoSSNFoundSameDOBSameLastName = generateRegisteredUser().withDetails(
      _.copy(
        dateOfBirth = DateOfBirth.unsafeFrom(reportUserNoSSNFoundBecauseSameDOBAndSameLastName.dateOfBirth),
        name = generatePersonalName().copy(lastName =
          LastName(reportUserNoSSNFoundBecauseSameDOBAndSameLastName.name.lastName).unsafe())))

    Given(
      "a report user without SSN, matching in our system because a user with same DoB and a last name with distance of 1 exists")
    val reportUserNoSSNFoundBecauseSameDOBAndCloseLastName =
      generateExcludedPlayer()
        .copy(ssn = None, name = generateName().copy(lastName = "Abcdefghijklmno"))
        .copy(exclusion = generateExclusion(ExclusionStatus.Removed))
    val registeredUserMatchingUserNoSSNFoundSameDOBCloseLastName = generateRegisteredUser().withDetails(
      _.copy(
        dateOfBirth = DateOfBirth.unsafeFrom(reportUserNoSSNFoundBecauseSameDOBAndCloseLastName.dateOfBirth),
        name = generatePersonalName().copy(lastName = LastName("Bbcdefghijklmno").unsafe())))

    Given(
      "a report user without SSN, NOT matching in our system even if a user with same DoB exists, as the last name is not even close")
    val reportUserNoSSNNotFound =
      generateExcludedPlayer().copy(ssn = None, name = generateName().copy(lastName = "Abcdefghijklmno"))
    val registeredUserNotMatchingUserNoSSNNotFound = generateRegisteredUser().withDetails(
      _.copy(
        dateOfBirth = DateOfBirth.unsafeFrom(reportUserNoSSNNotFound.dateOfBirth),
        name = generatePersonalName().copy(lastName = LastName("Notevenclose").unsafe())))

    Given("we setup the environment so that the described users exist in it")
    val excludedPlayersFeed =
      InMemoryExcludedPlayersFeed.returning(
        List(
          reportUserFullSSNFound,
          reportUserFullSSNNotFound,
          reportUserPartialSSNFound,
          reportUserPartialSSNNotFoundBecauseNotMatchingSSN,
          reportUserPartialSSNNotFoundBecauseNotMatchingDoB,
          reportUserNoSSNFoundBecauseSameDOBAndSameLastName,
          reportUserNoSSNFoundBecauseSameDOBAndCloseLastName,
          reportUserNoSSNNotFound))
    val excludedPlayersRepository = new InMemoryExcludedPlayersRepository()
    val puntersRepository = InMemoryPuntersRepository.withRegisteredPunters(
      clock.currentOffsetDateTime(),
      createPunter(registeredUserMatchingUserFullSSNFound, ssn = Some(ssnOfReportUserWithFullSSNFound)),
      createPunter(registeredUserMatchingUserPartialSSNFound, ssn = Some(ssnOfReportUserPartialSSNFound)),
      createPunter(registeredUserMatchingUserPartialSSNNotFound, ssn = Some(ssnOfReportUserPartialSSNNotFound)),
      createPunter(registeredUserMatchingUserNoSSNFoundSameDOBSameLastName, ssn = None),
      createPunter(registeredUserMatchingUserNoSSNFoundSameDOBCloseLastName, ssn = None),
      createPunter(registeredUserNotMatchingUserNoSSNNotFound, ssn = None))
    val puntersBoundedContext = new MemorizedTestPuntersContext()
    val betsBoundedContext = new MemorizedBetsBoundedContext()

    When("we ingest the report")
    val useCase = new IngestExcludedPlayersReport(
      excludedPlayersFeed,
      excludedPlayersRepository,
      puntersRepository,
      puntersBoundedContext,
      betsBoundedContext,
      clock)
    await(useCase.ingest())

    Then("the expected status punter status updates should have happened")
    puntersBoundedContext.selfExclusionStarts.get() should contain theSameElementsAs List(
      (registeredUserMatchingUserFullSSNFound.userId.asPunterId, SelfExclusionOrigin.External),
      (registeredUserMatchingUserNoSSNFoundSameDOBSameLastName.userId.asPunterId, SelfExclusionOrigin.External))

    puntersBoundedContext.selfExclusionEnds.get() should contain theSameElementsAs List(
      registeredUserMatchingUserPartialSSNFound.userId.asPunterId,
      registeredUserMatchingUserNoSSNFoundSameDOBCloseLastName.userId.asPunterId)
  }

  "it should cancel open bets for existing punters" in {
    val ssnOfReportUserWithFullSSNFound = generateFullSSN()
    val reportUserFullSSNFound = generateExcludedPlayer()
      .copy(ssn = Some(Right(ssnOfReportUserWithFullSSNFound)))
      .copy(exclusion = generateExclusion(ExclusionStatus.Active))
    val registeredUserMatchingUserFullSSNFound = generateRegisteredUser()

    val excludedPlayersFeed =
      InMemoryExcludedPlayersFeed.returning(List(reportUserFullSSNFound))
    val excludedPlayersRepository = new InMemoryExcludedPlayersRepository()
    val punter = createPunter(registeredUserMatchingUserFullSSNFound, ssn = Some(ssnOfReportUserWithFullSSNFound))
    val puntersRepository = InMemoryPuntersRepository.withRegisteredPunters(clock.currentOffsetDateTime(), punter)
    val puntersBoundedContext = new MemorizedTestPuntersContext()
    val betsBoundedContext = new MemorizedBetsBoundedContext()
    val betId = BetId.random()
    betsBoundedContext.bets =
      List((betId, AdminId.fromPunterId(punter.punterId), BetStatus.Open, clock.currentOffsetDateTime(), None))

    val useCase = new IngestExcludedPlayersReport(
      excludedPlayersFeed,
      excludedPlayersRepository,
      puntersRepository,
      puntersBoundedContext,
      betsBoundedContext,
      clock)
    await(useCase.ingest())

    betsBoundedContext.bets.filter(_._1 == betId).head._3 shouldBe BetStatus.Cancelled

  }
}
