package phoenix.bets.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetsBoundedContext
import phoenix.bets.BetsBoundedContext.BetCancellationError
import phoenix.bets.CancellationReason
import phoenix.core.Clock
import phoenix.punters.PunterEntity.AdminId

final class CancelBet(bets: BetsBoundedContext, clock: Clock)(implicit ec: ExecutionContext) {
  def cancelBet(
      betId: BetId,
      adminUser: AdminId,
      cancellationReason: CancellationReason): EitherT[Future, BetCancellationError, Unit] =
    bets.cancelBet(betId, adminUser, cancellationReason, betCancellationTimestamp = clock.currentOffsetDateTime())
}
