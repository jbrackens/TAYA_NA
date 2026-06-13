package phoenix.reports.integration
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import phoenix.core.Clock
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterDataGenerator.Api.generatePunterName
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterState.ActivationPath
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.PuntersRepository
import phoenix.reports.infrastructure.InMemoryPuntersRepository
import phoenix.reports.infrastructure.SlickPuntersRepository
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext
import phoenix.support.TruncatedTables

final class PuntersRepositorySpec
    extends AnyFlatSpec
    with Matchers
    with FutureSupport
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext
    with TruncatedTables
    with PuntersRepositoryBehavior {

  private val inMemoryRepository = () => new InMemoryPuntersRepository()
  private val jdbcRepository = () => {
    truncateTables()
    new SlickPuntersRepository(dbConfig)
  }

  ("InMemoryPuntersRepository" should behave).like(puntersRepository(inMemoryRepository))
  ("SlickPuntersRepository" should behave).like(puntersRepository(jdbcRepository))
}

trait PuntersRepositoryBehavior {
  this: AnyFlatSpec with Matchers with FutureSupport =>

  private val clock = Clock.utcClock

  final def puntersRepository(emptyRepository: () => PuntersRepository): Unit = {

    it should "create punter" in {
      val repository = emptyRepository()
      val punterId = generatePunterId()
      val punterName = generatePunterName()

      await(
        repository.upsert(
          PunterProfile(
            punterId,
            punterName,
            false,
            ActivationPath.Manual,
            suspensionReason = None,
            verifiedAt = None,
            verifiedBy = None)))

      val punters = await(repository.find(punterId))

      punters should contain(
        PunterProfile(
          punterId,
          punterName,
          false,
          ActivationPath.Manual,
          suspensionReason = None,
          verifiedAt = None,
          verifiedBy = None))
    }

    it should "not create punter twice" in {
      val repository = emptyRepository()
      val punterId = generatePunterId()
      val punterName = generatePunterName()

      val verifiedAt = clock.currentOffsetDateTime()
      await(
        repository.upsert(
          PunterProfile(
            punterId,
            punterName,
            false,
            ActivationPath.Manual,
            suspensionReason = None,
            verifiedAt = Some(verifiedAt),
            verifiedBy = None)))
      await(
        repository.upsert(
          PunterProfile(
            punterId,
            punterName,
            true,
            ActivationPath.Manual,
            suspensionReason = None,
            verifiedAt = Some(verifiedAt),
            verifiedBy = None)))

      val punters = await(repository.find(punterId))

      punters should contain(
        PunterProfile(
          punterId,
          punterName,
          true,
          ActivationPath.Manual,
          suspensionReason = None,
          verifiedAt = Some(verifiedAt),
          verifiedBy = None))
    }

    it should "update punter data with suspension reason" in {
      val repository = emptyRepository()
      val punterId = generatePunterId()
      val punterName = generatePunterName()

      await(
        repository.upsert(
          PunterProfile(
            punterId,
            punterName,
            true,
            ActivationPath.Manual,
            suspensionReason = None,
            verifiedAt = None,
            verifiedBy = None)))

      await(repository.setSuspensionReason(punterId, "just no"))
      val punters = await(repository.find(punterId))

      punters should contain(
        PunterProfile(
          punterId,
          punterName,
          true,
          ActivationPath.Manual,
          suspensionReason = Some("just no"),
          verifiedAt = None,
          verifiedBy = None))
    }

    it should "update punter data with verification data" in {
      val repository = emptyRepository()
      val punterId = generatePunterId()
      val punterName = generatePunterName()

      val verifiedAt = clock.currentOffsetDateTime()
      val verifiedBy = AdminId("admin")

      await(
        repository.upsert(
          PunterProfile(
            punterId,
            punterName,
            true,
            ActivationPath.Unknown,
            suspensionReason = Some("some reason"),
            verifiedAt = None,
            verifiedBy = None)))

      await(repository.setActivationPath(punterId, ActivationPath.Manual, verifiedAt, Some(verifiedBy)))
      await(repository.find(punterId)) should contain(
        PunterProfile(
          punterId,
          punterName,
          true,
          ActivationPath.Manual,
          suspensionReason = Some("some reason"),
          verifiedAt = Some(verifiedAt),
          verifiedBy = Some(verifiedBy)))
    }

    it should "return punters verified in specified period" in {
      val repository = emptyRepository()
      val punterIds = LazyList.continually(generatePunterId()).take(4).toSeq
      val punterName = generatePunterName()

      val verifiedBy = AdminId("admin")

      val now = clock.currentOffsetDateTime()
      val verifiedAt = Seq(now.minusMinutes(1).minusSeconds(1), now.minusMinutes(1), now, now.plusMinutes(1))
      (punterIds.zip(verifiedAt)).foreach {
        case (punterId, verifiedAt) =>
          await(
            repository.upsert(
              PunterProfile(
                punterId,
                punterName,
                true,
                ActivationPath.Manual,
                suspensionReason = Some("some reason"),
                verifiedAt = Some(verifiedAt),
                verifiedBy = Some(verifiedBy))))
      }
      (await(repository.getManuallyVerifiedPunters(now.minusMinutes(1), now.plusMinutes(1)))
        .map(_.punterId) should contain).allOf(punterIds(1), punterIds(2))
    }

    it should "not return punters not verified manually" in {
      val repository = emptyRepository()
      val punterName = generatePunterName()

      val verifiedAt = clock.currentOffsetDateTime()
      await(
        repository.upsert(
          PunterProfile(
            generatePunterId(),
            punterName,
            true,
            ActivationPath.KBA,
            suspensionReason = Some("some reason"),
            verifiedAt = Some(verifiedAt),
            verifiedBy = None)))

      await(repository.getManuallyVerifiedPunters(verifiedAt.minusMinutes(1), verifiedAt.plusMinutes(1)))
        .map(_.punterId) shouldBe empty
    }
  }
}
