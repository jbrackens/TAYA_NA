package phoenix.punters.integration

import scala.concurrent.Future
import scala.util.Random

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.core.Clock
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.Confidence
import phoenix.punters.domain.DeviceFingerprint
import phoenix.punters.domain.PunterDeviceFingerprint
import phoenix.punters.domain.PunterDeviceFingerprintsRepository
import phoenix.punters.domain.VisitorId
import phoenix.punters.infrastructure.SlickPunterDeviceFingerprintsRepository
import phoenix.punters.support.InMemoryPunterDeviceFingerprintsRepository
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext
import phoenix.support.TruncatedTables

final class PunterDeviceFingerprintsRepositorySpec
    extends AnyWordSpec
    with Matchers
    with FutureSupport
    with ProvidedExecutionContext
    with DatabaseIntegrationSpec
    with TruncatedTables {

  private val clock = Clock.utcClock
  private val inMemoryRepository = () => new InMemoryPunterDeviceFingerprintsRepository(clock)()
  private val slickRepository = () => {
    truncateTables()
    new SlickPunterDeviceFingerprintsRepository(dbConfig, clock)
  }

  "InMemoryPunterDeviceFingerprintsRepository" should behave.like(deviceFingerprintsRepository(inMemoryRepository))

  "SlickPunterDeviceFingerprintsRepository" should behave.like(deviceFingerprintsRepository(slickRepository))

  private def generateFingerprints(num: Int): Seq[(PunterId, DeviceFingerprint)] =
    List.fill(num) {
      generatePunterId() ->
      DeviceFingerprint(VisitorId.unsafe(Random.alphanumeric.take(22).mkString), Confidence.unsafe(Random.nextFloat()))
    }

  private def deviceFingerprintsRepository(emptyRepository: () => PunterDeviceFingerprintsRepository): Unit = {

    "insert and find device fingerprints for specific time period" in {
      val repository = emptyRepository()

      def insert10() = {
        val data = generateFingerprints(1)
        await(Future.sequence(data.map { case (punterId, fingerprint) => repository.insert(punterId, fingerprint) }))
        data
      }

      insert10()
      val beforeValidPeriod = clock.currentOffsetDateTime()
      val expectedResult = insert10()
      val afterValidPeriod = clock.currentOffsetDateTime()
      insert10()

      val returnedResult: Seq[PunterDeviceFingerprint] =
        await(repository.findPunterDeviceFingerprints(beforeValidPeriod, afterValidPeriod))

      returnedResult.map(r => (r.punterId, DeviceFingerprint(r.visitorId, r.confidence))) shouldBe expectedResult
    }

  }

}
