package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.bets.BetsBoundedContext
import phoenix.bets.BetsBoundedContext.BetCancellationError
import phoenix.bets.CancellationReason
import phoenix.core.Clock
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.PunterState.SelfExclusionOrigin
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.PunterSelfExclusionError
import phoenix.punters.application.SelfExcludeError.BetsCancellingErrorWhenSelfExcluding
import phoenix.punters.application.SelfExcludeError.ErrorWhenSelfExcluding

final class SelfExclude(punters: PuntersBoundedContext, bets: BetsBoundedContext)(implicit
    ec: ExecutionContext,
    clock: Clock) {

  def selfExclude(punterId: PunterId, duration: SelfExclusionDuration): EitherT[Future, SelfExcludeError, Unit] = {
    for {
      _ <-
        punters
          .beginSelfExclusion(punterId, SelfExclusionOrigin.Internal(duration))
          .leftMap[SelfExcludeError](ErrorWhenSelfExcluding)
      _ <-
        bets
          .cancelUnsettledBets(punterId, CancellationReason.unsafe("SelfExclude"))
          .leftMap[SelfExcludeError](BetsCancellingErrorWhenSelfExcluding)
    } yield ()
  }
}

sealed trait SelfExcludeError
object SelfExcludeError {
  final case class ErrorWhenSelfExcluding(error: PunterSelfExclusionError) extends SelfExcludeError
  final case class BetsCancellingErrorWhenSelfExcluding(error: BetCancellationError) extends SelfExcludeError
}
