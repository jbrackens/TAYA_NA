package phoenix.punters.application.es

import scala.concurrent.Future

import cats.data.EitherT

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.application.RetrievePunterProfileError
import phoenix.punters.domain.UserProfile

private[es] object Notifications {
  type PunterReader = PunterId => EitherT[Future, RetrievePunterProfileError, UserProfile]
}
