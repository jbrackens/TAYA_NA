package phoenix.bets.support

import scala.concurrent.Future

import phoenix.bets.GeolocationValidator
import phoenix.http.core.Geolocation

object TestGeolocationValidator {
  val valid: GeolocationValidator = alwaysReturning(true)
  val invalid: GeolocationValidator = alwaysReturning(false)

  private def alwaysReturning(result: Boolean): GeolocationValidator =
    (_: Geolocation) => Future.successful(result)
}
