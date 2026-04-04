package phoenix.sharding

import scala.reflect.ClassTag
import scala.reflect.classTag

import akka.cluster.sharding.typed.scaladsl.EntityTypeKey
import akka.persistence.typed.PersistenceId
import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec
import org.virtuslab.ash.annotation.SerializabilityTrait
import org.virtuslab.ash.annotation.Serializer
import org.virtuslab.ash.circe.CirceTraitCodec
import org.virtuslab.ash.circe.Register
import org.virtuslab.ash.circe.Registration

import phoenix.core.JsonFormats._
import phoenix.core.serialization.PhoenixCodecs
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.sports.SportEntity
import phoenix.punters.PunterEntity
import phoenix.wallets.WalletsBoundedContextProtocol

trait PhoenixId {
  def value: String
}

@SerializabilityTrait
trait PhoenixAkkaId extends PhoenixId

@Serializer(classOf[PhoenixAkkaId], Register.REGISTRATION_REGEX)
object PhoenixAkkaIdCodec extends CirceTraitCodec[PhoenixAkkaId] with PhoenixCodecs {
  private implicit lazy val marketIdCodec: Codec[MarketsBoundedContext.MarketId] = deriveCodec
  private implicit lazy val punterIdCodec: Codec[PunterEntity.PunterId] = deriveCodec
  private implicit lazy val fixtureIdCodec: Codec[SportEntity.FixtureId] = namespacedIdCodec(
    SportEntity.FixtureId.parse)
  private implicit lazy val walletIdCodec: Codec[WalletsBoundedContextProtocol.WalletId] = deriveCodec
  override lazy val codecs: Seq[Registration[_ <: PhoenixAkkaId]] =
    Seq(
      Register[MarketsBoundedContext.MarketId],
      Register[SportEntity.FixtureId],
      Register[PunterEntity.PunterId],
      Register[WalletsBoundedContextProtocol.WalletId])

  override lazy val manifestMigrations: Seq[(String, Class[_])] = Nil
  override lazy val packagePrefix: String = "phoenix"
  override lazy val classTagEvidence: ClassTag[PhoenixAkkaId] = classTag[PhoenixAkkaId]
  override lazy val errorCallback: String => Unit = x => throw new RuntimeException(x)
}

object PhoenixPersistenceId {
  def of(typeKey: EntityTypeKey[_], id: PhoenixId): PersistenceId = {
    // For safety, we're using `~` separator rather than the default `|` character
    // since we might have `|` in the entity id
    // and `PersistenceId.of` throws IllegalArgumentException when entity id contains the seperator character.
    PersistenceId.of(entityTypeHint = typeKey.name, entityId = id.value, separator = "~")
  }
}
