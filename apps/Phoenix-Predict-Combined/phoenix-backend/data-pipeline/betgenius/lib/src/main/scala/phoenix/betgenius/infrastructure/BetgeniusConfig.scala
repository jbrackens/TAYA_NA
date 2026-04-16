package phoenix.betgenius.infrastructure

import scala.concurrent.duration._

case class BetgeniusApiConfig(
    url: String,
    username: String,
    password: String,
    accessToken: String,
    environment: String,
    loginTokenTtl: FiniteDuration = 59 minutes) {
  val eSportId = 10915624
}
