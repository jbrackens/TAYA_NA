package phoenix.betgenius.domain

import scala.concurrent.Future

trait BetgeniusRestApi {

  def getESportFixtures(): Future[Seq[FixtureResponse]]

  def getCompetition(competitionId: Int): Future[CompetitionResponse]
}
