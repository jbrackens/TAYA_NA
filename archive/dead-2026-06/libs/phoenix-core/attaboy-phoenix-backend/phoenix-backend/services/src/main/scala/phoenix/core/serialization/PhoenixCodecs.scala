package phoenix.core.serialization
import java.util.concurrent.TimeUnit

import scala.concurrent.duration.Duration
import scala.concurrent.duration.FiniteDuration

import akka.actor
import akka.actor.typed.ActorRef
import akka.actor.typed.ActorRefResolver
import akka.actor.typed.ActorSystem
import akka.serialization.Serialization
import akka.stream.SinkRef
import akka.stream.SourceRef
import cats.data.NonEmptyList
import cats.data.Validated
import io.circe.Decoder.Result
import io.circe._
import io.circe.generic.semiauto._
import org.virtuslab.ash.circe.AkkaCodecs

import phoenix.CirceAkkaSerializable
import phoenix.bets.CancellationReason
import phoenix.bets.Stake
import phoenix.core.JsonFormats._
import phoenix.core.currency.DefaultCurrency
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.domain.NamespacedPhoenixId
import phoenix.core.validation.ValidationException
import phoenix.punters.domain.Limit
import phoenix.punters.domain.LimitPeriodType.Day
import phoenix.punters.domain.LimitPeriodType.Month
import phoenix.punters.domain.LimitPeriodType.Week
import phoenix.punters.domain.Limits
import phoenix.sharding.PhoenixAkkaId
import phoenix.sharding.PhoenixAkkaIdCodec
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId

/**
 * Define custom codecs here.
 *
 * To prevent `NullPointerException`, all fields must be either `lazy val` or `def`.
 *
 * To create codecs for private and package-private classes, define a new `trait` in the appropriate scope and make `PhoenixCodex` its subtype.
 *
 * @see [[io.circe.Encoder]] and [[io.circe.Decoder]] for default Encoder/Decoder pairs
 * @see [[org.virtuslab.ash.circe.AkkaCodecs]] for already defined Akka codecs
 */
trait PhoenixCodecs {
  implicit lazy val defaultCurrencyEncoder: Encoder[DefaultCurrency] = Encoder.encodeUnit.contramap(_ => ())
  implicit lazy val defaultCurrencyDecoder: Decoder[DefaultCurrency] = Decoder.decodeUnit.map(_ => DefaultCurrency)

  implicit lazy val defaultCurrencyMoneyCodec: Codec[DefaultCurrencyMoney] = deriveCodec
  implicit lazy val stakeCodec: Codec[Stake] =
    Codec.forProduct1[Stake, DefaultCurrencyMoney]("value")(Stake.unsafe)(Stake.unapply(_).get)

  implicit lazy val cancellationReasonEncoder: Encoder[CancellationReason] = Encoder.encodeString.contramap(_.value)
  implicit lazy val cancellationReasonDecoder: Decoder[CancellationReason] =
    Decoder.decodeString.map(CancellationReason.unsafe)

  implicit lazy val reservationIdKeyEncoder: KeyEncoder[ReservationId] =
    KeyEncoder.encodeKeyString.contramap(_.unwrap)
  implicit lazy val reservationIdKeyDecoder: KeyDecoder[ReservationId] =
    KeyDecoder.decodeKeyString.map(ReservationId.apply)

  implicit lazy val timeUnitEncoder: Encoder[TimeUnit] = Encoder.encodeString.contramap(_.name())
  implicit lazy val timeUnitDecoder: Decoder[TimeUnit] = Decoder.decodeString.map(TimeUnit.valueOf)

  implicit lazy val finiteDurationCodec: Codec[FiniteDuration] =
    Codec.forProduct2[FiniteDuration, Long, TimeUnit]("length", "unit")(Duration.apply)(Duration.unapply(_).get)

  implicit def limitsCodec[T](implicit
      dayE: Encoder[Limit[T, Day.type]],
      dayD: Decoder[Limit[T, Day.type]],
      weekE: Encoder[Limit[T, Week.type]],
      weekD: Decoder[Limit[T, Week.type]],
      monthE: Encoder[Limit[T, Month.type]],
      monthD: Decoder[Limit[T, Month.type]]): Codec[Limits[T]] =
    Codec.forProduct3[Limits[T], Limit[T, Day.type], Limit[T, Week.type], Limit[T, Month.type]](
      "daily",
      "weekly",
      "monthly")(Limits.make)(Limits.unapply(_).get)

  implicit lazy val phoenixAkkaIdCodec: Codec[PhoenixAkkaId] = PhoenixAkkaIdCodec

  def namespacedIdCodec[T <: NamespacedPhoenixId](parse: String => Validated[String, T]): Codec[T] =
    Codec[String].bimapValidated(_.value, parse(_).leftMap(e => NonEmptyList.of(ValidationException(e))))

  private implicit def serializationSystem: actor.ActorSystem = Serialization.getCurrentTransportInformation().system

  private val akkaCodecs = new AkkaCodecs {}

  implicit def actorRefCodec[T <: CirceAkkaSerializable]: Codec[ActorRef[T]] = {
    if (serializationSystem.name == "Phoenix") {
      akkaCodecs.actorRefCodec
    } else {
      new Codec[ActorRef[T]] {
        private def resolver = ActorRefResolver(ActorSystem.wrap(serializationSystem))

        override def apply(a: ActorRef[T]): Json =
          Encoder.encodeString.contramap[ActorRef[T]](resolver.toSerializationFormat)(a)

        override def apply(c: HCursor): Result[ActorRef[T]] =
          Decoder.decodeString.map(resolver.resolveActorRef)(c)
      }
    }
  }

  implicit def actorRefCodec2[T <: CirceAkkaSerializable]: Codec[ActorRef[SourceRef[T]]] = {
    if (serializationSystem.name == "Phoenix") {
      akkaCodecs.actorRefCodec
    } else {
      new Codec[ActorRef[SourceRef[T]]] {
        private def resolver = ActorRefResolver(ActorSystem.wrap(serializationSystem))

        override def apply(a: ActorRef[SourceRef[T]]): Json =
          Encoder.encodeString.contramap[ActorRef[SourceRef[T]]](resolver.toSerializationFormat)(a)

        override def apply(c: HCursor): Result[ActorRef[SourceRef[T]]] =
          Decoder.decodeString.map(resolver.resolveActorRef)(c)
      }
    }
  }

  implicit def sinkRefCodec[T <: CirceAkkaSerializable]: Codec[SinkRef[T]] = akkaCodecs.sinkRefCodec

  implicit def sourceRefCodec[T <: CirceAkkaSerializable]: Codec[SourceRef[T]] = akkaCodecs.sourceRefCodec
}
