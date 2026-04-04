package stella.wallet.models

import java.util.UUID

import akka.cluster.sharding.typed.scaladsl.EntityTypeKey
import akka.persistence.typed.PersistenceId
import io.circe.Decoder
import io.circe.Encoder
import io.circe.KeyDecoder
import io.circe.KeyEncoder
import pl.iterators.kebs.tagged._
import play.api.libs.json.Format
import play.api.libs.json.JsResult
import play.api.libs.json.{JsValue => PlayJsValue}
import spray.json.DefaultJsonProtocol._
import spray.json.JsValue
import spray.json.RootJsonFormat
import sttp.tapir.Codec
import sttp.tapir.Codec.parsedString
import sttp.tapir.CodecFormat.TextPlain
import sttp.tapir.Schema
import sttp.tapir.SchemaType.SInteger
import sttp.tapir.SchemaType.SString

import stella.common.http.json.JsonFormats.uuidFormat
import stella.common.models.Ids._

import stella.wallet.routes.ResponseFormats.uuidPlayFormat

object Ids {

  trait CurrencyInternalIdTag
  trait CurrencyChangelogEntryTag
  trait CurrencyIdTag
  trait TransactionIdTag

  type CurrencyInternalId = Long @@ CurrencyInternalIdTag
  type CurrencyChangelogEntryId = Long @@ CurrencyChangelogEntryTag
  type CurrencyId = UUID @@ CurrencyIdTag
  type TransactionId = Long @@ TransactionIdTag

  object ProjectIdInstances {
    implicit lazy val projectIdFormat: RootJsonFormat[ProjectId] =
      new RootJsonFormat[ProjectId] {
        override def read(value: JsValue): ProjectId = ProjectId(uuidFormat.read(value))

        override def write(id: ProjectId): JsValue = uuidFormat.write(id)
      }

    implicit lazy val projectIdSchema: Schema[ProjectId] = Schema[ProjectId](SString()).format("uuid")

    implicit lazy val projectIdCodec: Codec[String, ProjectId, TextPlain] =
      parsedString[ProjectId](str => ProjectId(UUID.fromString(str))).schema(projectIdSchema)

    implicit lazy val projectIdPlayFormat: Format[ProjectId] =
      new Format[ProjectId] {
        override def reads(json: PlayJsValue): JsResult[ProjectId] =
          uuidPlayFormat.reads(json).map(ProjectId.apply)

        override def writes(o: ProjectId): PlayJsValue = uuidPlayFormat.writes(o)
      }

    implicit val projectIdCirceEncoder: Encoder[ProjectId] =
      Encoder.encodeUUID.contramap[ProjectId](_.t)

    implicit val projectIdCirceDecoder: Decoder[ProjectId] = Decoder.decodeUUID.map[ProjectId](ProjectId.apply)
  }

  object CurrencyInternalId {
    def apply(id: Long): CurrencyInternalId = id.taggedWith[CurrencyInternalIdTag]
  }

  object CurrencyChangelogEntryId {
    def apply(id: Long): CurrencyChangelogEntryId = id.taggedWith[CurrencyChangelogEntryTag]
  }

  object CurrencyId {
    def apply(id: UUID): CurrencyId = id.taggedWith[CurrencyIdTag]

    def random(): CurrencyId = CurrencyId(UUID.randomUUID())

    implicit lazy val currencyIdFormat: RootJsonFormat[CurrencyId] =
      new RootJsonFormat[CurrencyId] {
        override def read(value: JsValue): CurrencyId = CurrencyId(uuidFormat.read(value))

        override def write(id: CurrencyId): JsValue = uuidFormat.write(id)
      }

    implicit lazy val currencyIdSchema: Schema[CurrencyId] = Schema[CurrencyId](SString()).format("uuid")

    implicit lazy val currencyIdCodec: Codec[String, CurrencyId, TextPlain] =
      parsedString[CurrencyId](str => CurrencyId(UUID.fromString(str))).schema(currencyIdSchema)

    implicit lazy val currencyIdPlayFormat: Format[CurrencyId] =
      new Format[CurrencyId] {
        override def reads(json: PlayJsValue): JsResult[CurrencyId] =
          uuidPlayFormat.reads(json).map(CurrencyId.apply)

        override def writes(o: CurrencyId): PlayJsValue = uuidPlayFormat.writes(o)
      }

    implicit val currencyIdCirceEncoder: Encoder[CurrencyId] =
      Encoder.encodeUUID.contramap[CurrencyId](_.t)

    implicit val currencyIdCirceDecoder: Decoder[CurrencyId] = Decoder.decodeUUID.map[CurrencyId](CurrencyId.apply)

    implicit lazy val currencyIdCirceKeyEncoder: KeyEncoder[CurrencyId] =
      KeyEncoder.encodeKeyUUID.contramap(_.t)

    implicit lazy val currencyIdCirceKeyDecoder: KeyDecoder[CurrencyId] =
      KeyDecoder.decodeKeyUUID.map(CurrencyId.apply)
  }

  object UserIdInstances {
    implicit lazy val userIdFormat: RootJsonFormat[UserId] =
      new RootJsonFormat[UserId] {
        override def read(value: JsValue): UserId = UserId(uuidFormat.read(value))

        override def write(id: UserId): JsValue = uuidFormat.write(id)
      }

    implicit lazy val userIdSchema: Schema[UserId] = Schema[UserId](SString()).format("uuid")

    implicit lazy val userIdCodec: Codec[String, UserId, TextPlain] =
      parsedString[UserId](str => UserId(UUID.fromString(str))).schema(userIdSchema)

    implicit lazy val userIdPlayFormat: Format[UserId] =
      new Format[UserId] {
        override def reads(json: PlayJsValue): JsResult[UserId] =
          uuidPlayFormat.reads(json).map(UserId.apply)

        override def writes(id: UserId): PlayJsValue = uuidPlayFormat.writes(id)
      }

    implicit val userIdCirceEncoder: Encoder[UserId] = Encoder.encodeUUID.contramap[UserId](_.t)

    implicit val userIdCirceDecoder: Decoder[UserId] = Decoder.decodeUUID.map[UserId](UserId.apply)
  }

  object TransactionId {
    def apply(id: Long): TransactionId = id.taggedWith[TransactionIdTag]

    implicit lazy val transactionIdFormat: RootJsonFormat[TransactionId] =
      new RootJsonFormat[TransactionId] {
        override def read(value: JsValue): TransactionId = TransactionId(LongJsonFormat.read(value))

        override def write(id: TransactionId): JsValue = LongJsonFormat.write(id)
      }

    implicit lazy val transactionIdSchema: Schema[TransactionId] = Schema[TransactionId](SInteger())
  }

  final case class WalletKey(userId: UserId) {
    def entityId: UUID = userId
  }

  object WalletKey {
    def fromEntityId(entityId: UUID): WalletKey = {
      val userId = UserId(entityId)
      WalletKey(userId)
    }
  }

  object WalletPersistenceId {
    private val persistenceIdSeparator = "~"

    def of(typeKey: EntityTypeKey[_], walletKey: WalletKey): PersistenceId = {
      PersistenceId.of(
        entityTypeHint = typeKey.name,
        entityId = walletKey.entityId.toString,
        separator = persistenceIdSeparator)
    }
  }
}
