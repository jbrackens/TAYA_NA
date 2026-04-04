package tech.argyll.gmx.predictorgame.services.leaderboard

trait LeaderboardOps {

  def pickTop(standing: List[LeaderboardEntry], n: Int): List[LeaderboardEntry] = {
    limit(standing, n, false, Nil).reverse
  }

  private def limit(toProcess: List[LeaderboardEntry], n: Int, hasCurrent: Boolean, result: List[LeaderboardEntry]): List[LeaderboardEntry] = {
    toProcess match {
      case Nil => result
      case item :: t =>
        if (result.size < n - 1) {
          val found = hasCurrent || item.me
          limit(t, n, found, item :: result)
        } else {
          if (hasCurrent) {
            item :: result
          } else {
            (item :: t).find(_.me).getOrElse(item) :: result
          }
        }
    }
  }
}
