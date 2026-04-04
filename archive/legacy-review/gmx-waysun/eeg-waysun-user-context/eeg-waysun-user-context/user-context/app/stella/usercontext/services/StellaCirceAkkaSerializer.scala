package stella.usercontext.services

import akka.actor.ExtendedActorSystem
import io.circe.generic.auto._
import org.virtuslab.ash.annotation.Serializer
import org.virtuslab.ash.circe.CirceAkkaSerializer
import org.virtuslab.ash.circe.Register
import org.virtuslab.ash.circe.Registration

import stella.usercontext.models.StellaCirceAkkaSerializable
import stella.usercontext.models.UserContextState
import stella.usercontext.services.UserContextActorProtocol._

/**
 * Custom Akka serializer based on Circe. All subtypes of [[stella.usercontext.models.StellaCirceAkkaSerializable]] must be registered here.
 */
@Serializer(classOf[StellaCirceAkkaSerializable], typeRegexPattern = Register.REGISTRATION_REGEX)
class StellaCirceAkkaSerializer(actorSystem: ExtendedActorSystem)
    extends CirceAkkaSerializer[StellaCirceAkkaSerializable](actorSystem) {
  override lazy val identifier: Int = 92 // some arbitrary value

  override lazy val codecs: Seq[Registration[_ <: StellaCirceAkkaSerializable]] =
    Seq(
      Register[UserContextCommand],
      Register[PutUserContextResponse],
      Register[ModifyUserContextResponse],
      Register[GetUserContextResponse],
      Register[DeleteUserContextResponse],
      Register[UserContextState])

  override lazy val manifestMigrations: Seq[(String, Class[_])] = Seq.empty
  override lazy val packagePrefix: String = "stella.usercontext"
}
