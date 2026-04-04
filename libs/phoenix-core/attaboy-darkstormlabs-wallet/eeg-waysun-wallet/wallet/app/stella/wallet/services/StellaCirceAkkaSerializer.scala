package stella.wallet.services

import akka.actor.ExtendedActorSystem
import io.circe.generic.auto._
import org.virtuslab.ash.annotation.Serializer
import org.virtuslab.ash.circe.CirceAkkaSerializer
import org.virtuslab.ash.circe.Register
import org.virtuslab.ash.circe.Registration

import stella.wallet.models.Ids.CurrencyId._
import stella.wallet.models.Ids.ProjectIdInstances._
import stella.wallet.models.Ids.UserIdInstances._
import stella.wallet.models.StellaCirceAkkaSerializable
import stella.wallet.models.wallet.WalletState
import stella.wallet.services.WalletActorProtocol._

/**
 * Custom Akka serializer based on Circe. All subtypes of [[stella.wallet.models.StellaCirceAkkaSerializable]] must be registered here.
 */
@Serializer(classOf[StellaCirceAkkaSerializable], typeRegexPattern = Register.REGISTRATION_REGEX)
class StellaCirceAkkaSerializer(actorSystem: ExtendedActorSystem)
    extends CirceAkkaSerializer[StellaCirceAkkaSerializable](actorSystem) {
  override lazy val identifier: Int = 87 // some arbitrary value

  override lazy val codecs: Seq[Registration[_ <: StellaCirceAkkaSerializable]] =
    Seq(Register[WalletCommand], Register[WalletEvent], Register[WalletResponse], Register[WalletState])

  override lazy val manifestMigrations: Seq[(String, Class[_])] = Seq.empty
  override lazy val packagePrefix: String = "stella.wallet"
}
