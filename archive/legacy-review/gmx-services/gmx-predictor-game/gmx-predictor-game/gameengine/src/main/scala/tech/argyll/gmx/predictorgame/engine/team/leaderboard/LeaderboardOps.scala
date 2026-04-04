package tech.argyll.gmx.predictorgame.engine.team.leaderboard

trait LeaderboardOps {

  val disqualifiedPlace: Place = None

  def calculateStandings(players: Seq[UserScore]): List[(Place, UserScore)] = {
    val inputSorted = players.toList.sortBy(a => (-a.score, a.user.name))
    assignPlace(inputSorted, Int.MaxValue, Int.MinValue, Nil, Nil).reverse
  }

  private def assignPlace(toProcess: List[UserScore], prevScore: Int, prevPlace: Int, result: List[(Place, UserScore)], disq: List[(Place, UserScore)]): List[(Place, UserScore)] = {
    toProcess match {
      case Nil => disq ++ result
      case userScore :: t =>
        if (!userScore.eligible) {
          assignPlace(t, prevScore, prevPlace, result, (disqualifiedPlace, userScore) :: disq)
        } else if (userScore.score < prevScore) {
          val currPlace = result.size + 1
          assignPlace(t, userScore.score, currPlace, (Some(currPlace), userScore) :: result, disq)
        } else if (userScore.score == prevScore) {
          assignPlace(t, userScore.score, prevPlace, (Some(prevPlace), userScore) :: result, disq)
        } else {
          throw new IllegalStateException("Should never happen")
        }
    }
  }
}
