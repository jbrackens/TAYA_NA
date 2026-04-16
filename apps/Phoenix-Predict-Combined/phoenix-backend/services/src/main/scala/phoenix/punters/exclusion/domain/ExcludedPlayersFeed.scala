package phoenix.punters.exclusion.domain

import akka.NotUsed
import akka.stream.scaladsl.Source

trait ExcludedPlayersFeed {
  def getExcludedPlayers(): Source[ExcludedPlayer, NotUsed]
}
