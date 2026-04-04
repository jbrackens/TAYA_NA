package phoenix.bets

import scala.concurrent.Future

import phoenix.http.core.Geolocation

trait GeolocationValidator {
  def isValid(geolocation: Geolocation): Future[Boolean]
}

object AlwaysValidGeolocationValidator extends GeolocationValidator {
  override def isValid(geolocation: Geolocation): Future[Boolean] = Future.successful(true)
}
