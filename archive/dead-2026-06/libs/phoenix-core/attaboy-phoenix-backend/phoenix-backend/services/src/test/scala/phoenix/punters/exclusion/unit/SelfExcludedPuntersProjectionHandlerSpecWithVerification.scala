package phoenix.punters.exclusion.unit

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterProtocol.Events.SelfExclusionBegan
import phoenix.punters.PunterProtocol.Events.SelfExclusionEnded
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.PunterState.SelfExclusionOrigin
import phoenix.punters.exclusion.application.es.SelfExcludedPuntersProjectionHandler
import phoenix.punters.exclusion.domain.SelfExcludedPunter
import phoenix.punters.exclusion.support.InMemorySelfExcludedPuntersRepository
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock

final class SelfExcludedPuntersProjectionHandlerSpecWithVerification
    extends AnyWordSpec
    with Matchers
    with ActorSystemIntegrationSpec
    with FutureSupport {

  implicit val clock = new FakeHardcodedClock()

  val repository = new InMemorySelfExcludedPuntersRepository()

  val handle = SelfExcludedPuntersProjectionHandler.handle(repository) _

  "should insert a self excluded punter on SelfExclusionBegan with internal origin" in {
    // given
    val selfExclusionDuration = SelfExclusionDuration.OneYear
    val event = SelfExclusionBegan(generatePunterId(), SelfExclusionOrigin.Internal(selfExclusionDuration))
    val eventCreatedAt = randomOffsetDateTime()

    // when
    handle(event, eventCreatedAt).futureValue

    // then
    repository.search(event.punterId).futureValue shouldBe Some(
      SelfExcludedPunter(event.punterId, selfExclusionDuration, eventCreatedAt))
  }

  "do nothing on SelfExclusionBegan with external origin" in {
    // given
    val event = SelfExclusionBegan(generatePunterId(), SelfExclusionOrigin.External)
    val eventCreatedAt = randomOffsetDateTime()

    // when
    handle(event, eventCreatedAt).futureValue

    // then
    repository.search(event.punterId).futureValue shouldBe None
  }

  "delete existing self excluded punters on SelfExclusionEnded" in {
    // given
    val punterId = generatePunterId()
    val event = SelfExclusionEnded(punterId)
    val eventCreatedAt = randomOffsetDateTime()
    await(repository.upsert(SelfExcludedPunter(punterId, SelfExclusionDuration.OneYear, randomOffsetDateTime())))

    // when
    handle(event, eventCreatedAt).futureValue

    // then
    repository.search(punterId).futureValue shouldBe None
  }
}
