package phoenix.punters.exclusion.support

import akka.NotUsed
import akka.stream.scaladsl.Source

import phoenix.punters.exclusion.domain.ExcludedPlayer
import phoenix.punters.exclusion.domain.ExcludedPlayersFeed

object InMemoryExcludedPlayersFeed {
  def returning(excludedUsers: List[ExcludedPlayer]): ExcludedPlayersFeed =
    new ExcludedPlayersFeed() {
      override def getExcludedPlayers(): Source[ExcludedPlayer, NotUsed] =
        Source(excludedUsers)
    }
}
