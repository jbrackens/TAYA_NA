package phoenix.dbviews.infrastructure

import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.bets.support.BetsBoundedContextMock
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess
import phoenix.core.Clock
import phoenix.core.deployment.DeploymentClock
import phoenix.dbviews.domain.model.KYCVerificationMethod
import phoenix.dbviews.infrastructure.View01PatronDetailsProjectionHandler
import phoenix.dbviews.support.InMemoryView01PatronDetailsRepository
import phoenix.punters.PunterDataGenerator.Api.generatePunterProfileCreatedEvent
import phoenix.punters.PunterDataGenerator.Api.generatePunterVerifiedEvent
import phoenix.punters.PunterDataGenerator.generatePunterWithPartialSSN
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.application.UpdatePunterDetails
import phoenix.punters.exclusion.support.InMemoryExcludedPlayersRepository
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdatePunterPhoneNumberRequest
import phoenix.punters.support.InMemoryPuntersRepository
import phoenix.shared.support.TimeSupport.deploymentConfig
import phoenix.support.FutureSupport
import phoenix.support.UserGenerator.generateMobilePhoneNumber

final class View01PatronDetailsSpec extends AnyWordSpec with Matchers with FutureSupport {

  private implicit val ec: ExecutionContext = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor())
  private implicit val clock: Clock = Clock.utcClock
  private val easternClock = DeploymentClock.fromConfig(deploymentConfig)

  "PatronDetailsProjectionHandlers" should {
    "handle PunterProfileCreated event" in {
      // given
      val applicationPuntersRepository = new InMemoryPuntersRepository()
      val puntersViewRepository = new InMemoryView01PatronDetailsRepository(easternClock)
      // when
      val now = clock.currentOffsetDateTime()

      val event = generatePunterProfileCreatedEvent()
      val punterId = event.punterId
      awaitRight(
        applicationPuntersRepository
          .startPunterRegistration(generatePunterWithPartialSSN(punterId = punterId), clock.currentOffsetDateTime()))
      await(
        View01PatronDetailsProjectionHandler.handle(puntersViewRepository, applicationPuntersRepository)(event, now))

      // then
      puntersViewRepository.patronDetails.size shouldBe 1
    }
    "handle PunterVerified event" in {
      // given
      val applicationPuntersRepository = new InMemoryPuntersRepository()
      val puntersViewRepository = new InMemoryView01PatronDetailsRepository(easternClock)
      // when
      val now = clock.currentOffsetDateTime()

      val firstCreateEvent = generatePunterProfileCreatedEvent()
      val firstPunterId = firstCreateEvent.punterId
      val firstVerifiedEvent = generatePunterVerifiedEvent(firstPunterId)
      awaitRight(applicationPuntersRepository
        .startPunterRegistration(generatePunterWithPartialSSN(punterId = firstPunterId), clock.currentOffsetDateTime()))
      await(
        View01PatronDetailsProjectionHandler
          .handle(puntersViewRepository, applicationPuntersRepository)(firstCreateEvent, now))
      await(View01PatronDetailsProjectionHandler
        .handle(puntersViewRepository, applicationPuntersRepository)(firstVerifiedEvent, firstVerifiedEvent.verifiedAt))

      val secondCreateEvent = generatePunterProfileCreatedEvent()
      val secondPunterId = secondCreateEvent.punterId
      val secondVerifiedEvent = generatePunterVerifiedEvent(secondPunterId)
      awaitRight(
        applicationPuntersRepository.startPunterRegistration(
          generatePunterWithPartialSSN(punterId = secondPunterId),
          clock.currentOffsetDateTime()))
      await(
        View01PatronDetailsProjectionHandler
          .handle(puntersViewRepository, applicationPuntersRepository)(secondCreateEvent, now))
      await(
        View01PatronDetailsProjectionHandler.handle(puntersViewRepository, applicationPuntersRepository)(
          secondVerifiedEvent,
          secondVerifiedEvent.verifiedAt))

      // then
      puntersViewRepository.patronDetails.size shouldBe 2
      puntersViewRepository.patronDetails.head.patronDetails.punterId shouldBe firstPunterId
      puntersViewRepository.patronDetails.head.patronDetails.kyc.kycVerificationTime shouldBe firstVerifiedEvent.verifiedAt
      puntersViewRepository.patronDetails.head.patronDetails.kyc.kycVerificationMethod shouldBe KYCVerificationMethod.Automatic
    }
  }

  "UpdatePunterDetails" should {
    "update details in puntersViewRepository" in {
      // given
      val applicationPuntersRepository = new InMemoryPuntersRepository()
      val puntersViewRepository = new InMemoryView01PatronDetailsRepository(easternClock)
      val excludedPlayersRepository = new InMemoryExcludedPlayersRepository()
      val punters: PuntersBoundedContext = new PuntersContextProviderSuccess()
      val bets = BetsBoundedContextMock.betsWithDomainFailureMock
      val request = UpdatePunterPhoneNumberRequest(generateMobilePhoneNumber())
      // when
      val now = clock.currentOffsetDateTime()

      val event = generatePunterProfileCreatedEvent()
      val punterId = event.punterId
      awaitRight(
        applicationPuntersRepository
          .startPunterRegistration(generatePunterWithPartialSSN(punterId = punterId), clock.currentOffsetDateTime()))
      await(
        View01PatronDetailsProjectionHandler.handle(puntersViewRepository, applicationPuntersRepository)(event, now))
      val updatePunterDetailsUseCase =
        new UpdatePunterDetails(
          applicationPuntersRepository,
          puntersViewRepository,
          excludedPlayersRepository,
          punters,
          bets)
      awaitRight(updatePunterDetailsUseCase.updatePunterPhoneNumber(punterId, request))

      // then
      puntersViewRepository.patronDetails.size shouldBe 1
      puntersViewRepository.patronDetails.head.patronDetails.personal.phoneNumber shouldBe request.phoneNumber
    }
  }
}
