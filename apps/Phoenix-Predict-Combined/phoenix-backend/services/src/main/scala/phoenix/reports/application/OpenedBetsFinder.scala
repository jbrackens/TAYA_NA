package phoenix.reports.application

import java.time.OffsetDateTime

import akka.NotUsed
import akka.stream.scaladsl.Source

import phoenix.reports.domain.Bet
import phoenix.reports.domain.BetsRepository

final class OpenedBetsFinder(betsRepository: BetsRepository) {
  def findOpenBetsAsOf(reference: OffsetDateTime): Source[Bet, NotUsed] =
    betsRepository.findOpenBetsAsOf(reference)
}
