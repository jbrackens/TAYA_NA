package phoenix.reports.integration

import scala.reflect.ClassTag

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.http.core.Device
import phoenix.http.core.IpAddress
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.reports.domain.DeceasedPunters.DeceasedPunterInformation
import phoenix.reports.domain.DeceasedPuntersRepository
import phoenix.reports.infrastructure.InMemoryDeceasedPuntersRepository
import phoenix.reports.infrastructure.SlickDeceasedPuntersRepository
import phoenix.support._
import phoenix.time.FakeHardcodedClock

final class DeceasedPuntersRepositoryIntegrationSpec
    extends AnyWordSpecLike
    with Matchers
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext
    with FutureSupport
    with TruncatedTables {

  private case class TestSetup[R <: DeceasedPuntersRepository: ClassTag](constructRepository: () => R) {
    def identifier: String = implicitly[ClassTag[R]].runtimeClass.getSimpleName
  }

  private val clock = new FakeHardcodedClock()

  private val liveRepositorySetup = TestSetup(() => {
    truncateTables()
    new SlickDeceasedPuntersRepository(dbConfig, clock)
  })

  private val testRepositorySetup =
    TestSetup(() => new InMemoryDeceasedPuntersRepository(clock))

  List(testRepositorySetup, liveRepositorySetup).foreach { testSetup =>
    s"${testSetup.identifier}" should {
      "save the deceased punter and return all deceased punters" in {
        val repository = testSetup.constructRepository()

        val punterId1 = generatePunterId()
        val punter1SuspendedAt = clock.currentOffsetDateTime().minusDays(1)
        val punterId2 = generatePunterId()
        val punter2SuspendedAt = clock.currentOffsetDateTime().minusDays(2)
        await(
          repository
            .save(punterId1, punter1SuspendedAt, Some(IpAddress("127.0.0.1")), Some(Device("Firefox on MacOS"))))
        await(repository.save(punterId2, punter2SuspendedAt, None, None))

        val allDeceasedPunterIds = await(repository.getAllDeceasedPunters())
        (allDeceasedPunterIds should contain).allOf(
          DeceasedPunterInformation(
            punterId = punterId1,
            suspendedAt = punter1SuspendedAt,
            clientIp = Some(IpAddress("127.0.0.1")),
            device = Some(Device("Firefox on MacOS"))),
          DeceasedPunterInformation(
            punterId = punterId2,
            suspendedAt = punter2SuspendedAt,
            clientIp = None,
            device = None))
      }

      "retrieve deceased punters for given period" in {
        val repository = testSetup.constructRepository()

        val now = clock.currentOffsetDateTime()
        val punterId1 = generatePunterId()
        val punterId2 = generatePunterId()
        val punterId3 = generatePunterId()

        await(repository.save(generatePunterId(), now.minusMinutes(1).minusSeconds(1), None, None))
        await(repository.save(punterId1, now.minusMinutes(1), None, None))
        await(repository.save(punterId2, now, None, None))
        await(repository.save(punterId3, now.plusMinutes(1).minusSeconds(1), None, None))
        await(repository.save(generatePunterId(), now.plusMinutes(1), None, None))
        await(repository.save(generatePunterId(), now.plusMinutes(2), None, None))

        val returnedIds =
          await(repository.getDeceasedPuntersForPeriod(now.minusMinutes(1), now.plusMinutes(1))).map(_.punterId)
        (returnedIds should contain).allOf(punterId1, punterId2, punterId3)
      }
    }
  }
}
