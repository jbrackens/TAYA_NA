package phoenix.punters.exclusion.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.stream.Materializer
import cats.data.EitherT
import cats.data.OptionT
import cats.instances.future._
import cats.syntax.functor._
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.bets.BetsBoundedContext
import phoenix.bets.CancellationReason
import phoenix.core.Clock
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.SelfExclusionOrigin
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.application.SelfExcludeError
import phoenix.punters.application.SelfExcludeError.BetsCancellingErrorWhenSelfExcluding
import phoenix.punters.application.SelfExcludeError.ErrorWhenSelfExcluding
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.Punter
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.SelfExcludedPunterSearch
import phoenix.punters.exclusion.domain.ExcludedPlayer
import phoenix.punters.exclusion.domain.ExcludedPlayersFeed
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.exclusion.domain.ExclusionStatus

final class IngestExcludedPlayersReport(
    feed: ExcludedPlayersFeed,
    excludedPlayersRepository: ExcludedPlayersRepository,
    puntersRepository: PuntersRepository,
    puntersBoundedContext: PuntersBoundedContext,
    betsBoundedContext: BetsBoundedContext,
    clock: Clock)(implicit mat: Materializer, ec: ExecutionContext) {

  private val log: Logger = LoggerFactory.getLogger(getClass)

  def ingest(): Future[Unit] =
    feed
      .getExcludedPlayers()
      .mapAsync(parallelism = 10) { player =>
        log.info(s"Ingesting DGE excluded player $player)")
        ingestExcludedPlayer(player)
      }
      .run()
      .void

  private def ingestExcludedPlayer(player: ExcludedPlayer): Future[Unit] =
    for {
      _ <- excludedPlayersRepository.upsert(player)
      _ <- searchPunterInOurSystem(player)
        .semiflatMap(punter => updatePunterInOurSystem(punter.punterId, player.exclusion.status))
        .value
    } yield ()

  private def searchPunterInOurSystem(dgePlayer: ExcludedPlayer): OptionT[Future, Punter] = {
    val punterSearch = SelfExcludedPunterSearch(
      ssn = dgePlayer.ssn,
      name = dgePlayer.name.normalizedLastName,
      dateOfBirth = DateOfBirth.unsafeFrom(dgePlayer.dateOfBirth))

    // TODO (PHXD-1926): Handle Self-exclusion close-match cases - currently, we just treat it as a full match
    puntersRepository.findExcludedPunters(punterSearch).map { case (punter, _) => punter }
  }

  private def updatePunterInOurSystem(punterId: PunterId, exclusionStatus: ExclusionStatus): Future[Unit] = {
    exclusionStatus match {
      case ExclusionStatus.Active  => beginSelfExclusion(punterId)
      case ExclusionStatus.Removed => endSelfExclusion(punterId)
    }
  }

  private def beginSelfExclusion(punterId: PunterId): Future[Unit] = {
    (for {
      _ <-
        puntersBoundedContext
          .beginSelfExclusion(punterId, SelfExclusionOrigin.External)
          .recoverWith {
            case PuntersBoundedContext.PunterProfileDoesNotExist(punterId) =>
              EitherT.liftF(Future.failed(PunterProfileNotFound(punterId)))
            case PuntersBoundedContext.PunterInSelfExclusionError(_) => EitherT.liftF(Future.unit)
          }
          .leftMap[SelfExcludeError](ErrorWhenSelfExcluding)
      _ <-
        betsBoundedContext
          .cancelUnsettledBets(punterId, CancellationReason.unsafe("SelfExclude"))(ec, clock)
          .leftMap[SelfExcludeError](BetsCancellingErrorWhenSelfExcluding)
    } yield ()).value.map(_ => ())
  }

  private def endSelfExclusion(existingPunterId: PunterId): Future[Unit] = {
    puntersBoundedContext
      .endSelfExclusion(existingPunterId)
      .foldF(
        {
          case PuntersBoundedContext.PunterProfileDoesNotExist(punterId) =>
            Future.failed(PunterProfileNotFound(punterId))
          case PuntersBoundedContext.PunterSuspendedError(_) =>
            Future.unit
          case PuntersBoundedContext.PunterNotInSelfExclusionError(_) =>
            Future.unit
        },
        _ => Future.unit)
  }
}

private final case class PunterProfileNotFound(punterId: PunterId) extends RuntimeException
