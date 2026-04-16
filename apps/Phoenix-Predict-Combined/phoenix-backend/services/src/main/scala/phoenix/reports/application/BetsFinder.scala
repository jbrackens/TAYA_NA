package phoenix.reports.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.bets.BetEntity.BetId
import phoenix.reports.application.BetsFinder.BetDoesNotExist
import phoenix.reports.domain.Bet
import phoenix.reports.domain.BetsRepository

private[reports] final class BetsFinder(repository: BetsRepository)(implicit ec: ExecutionContext) {

  def find(betId: BetId): Future[Bet] = {
    repository.find(betId).getOrElseF(Future.failed(BetDoesNotExist(betId)))
  }
}

object BetsFinder {
  final case class BetDoesNotExist(id: BetId) extends RuntimeException
}
