package phoenix.websockets.messages

import cats.data.NonEmptyList
import io.circe.Codec
import io.circe.Decoder
import io.circe.Encoder
import io.circe.HCursor
import io.circe.Json
import io.circe.generic.semiauto.deriveCodec
import io.circe.syntax._

import phoenix.bets.BetStateUpdate
import phoenix.bets.infrastructure.BetJsonFormats._
import phoenix.core.JsonFormats._
import phoenix.core.error.PresentationErrorCode
import phoenix.core.validation.ValidationException
import phoenix.http.BearerToken
import phoenix.markets.MarketsBoundedContext.FixtureStateUpdate
import phoenix.markets.MarketsBoundedContext.MarketStateUpdate
import phoenix.markets.infrastructure.MarketJsonFormats.fixtureSocketSummaryCodec
import phoenix.markets.infrastructure.MarketJsonFormats.marketStateUpdateCodec
import phoenix.wallets.domain.WalletStateUpdate
import phoenix.wallets.infrastructure.WalletJsonFormats.walletBalanceCodec
import phoenix.wallets.infrastructure.WalletJsonFormats.walletIdCodec
import phoenix.websockets.messages.WebSocketMessageConstants.ChannelField
import phoenix.websockets.messages.WebSocketMessageConstants._

object WebSocketJsonFormats {
  implicit val walletStateUpdateCodec: Codec[WalletStateUpdate] = deriveCodec

  implicit object PresentationErrorCodeCodec extends Codec[PresentationErrorCode] {
    override def apply(c: HCursor): Decoder.Result[PresentationErrorCode] =
      c.as[String]
        .flatMap(_ match {
          case "invalidJson"               => Right(PresentationErrorCode.InvalidJson)
          case "invalidAuthToken"          => Right(PresentationErrorCode.InvalidAuthToken)
          case "marketNotFound"            => Right(PresentationErrorCode.MarketNotFound)
          case "punterProfileDoesNotExist" => Right(PresentationErrorCode.PunterProfileDoesNotExist)
          case "internalError"             => Right(PresentationErrorCode.InternalError)
          case x                           => c.fail(s"Unexpected error code '$x'")
        })

    override def apply(errorCode: PresentationErrorCode): Json = Json.fromString(errorCode.value)
  }

  implicit val correlationIdCodec: Codec[CorrelationId] = Codec[String].bimap(_.value, CorrelationId.apply)

  implicit val channelCodec: Codec[Channel] = Codec[String]
    .bimapValidated(_.rawValue, Channel.fromString(_).leftMap(error => NonEmptyList.one(ValidationException(error))))

  implicit val heartbeatEncoder: Encoder[HeartbeatChannel] = Encoder.instance(channelCodec.apply)

  implicit val bearerTokenCodec: Codec[BearerToken] = Codec[String].bimap(_.rawValue, BearerToken.apply)

  implicit object HeartbeatCodec extends Codec[Heartbeat] {
    override def apply(c: HCursor): Decoder.Result[Heartbeat] = Right(Heartbeat())
    override def apply(heartbeat: Heartbeat): Json =
      Json.obj(EventField -> Json.fromString(HeartbeatKey), ChannelField -> heartbeat.channel.asJson)
  }

  implicit object SubscribeCodec extends Codec[Subscribe] {
    override def apply(subscribe: Subscribe): Json = {
      val json = Json.obj(
        EventField -> Json.fromString(SubscribeKey),
        ChannelField -> subscribe.channel.asJson,
        CorrelationIdField -> subscribe.correlationId.asJson)
      subscribe.token match {
        case None        => json
        case Some(token) => json.mapObject(_.add(TokenField, token.asJson))
      }
    }
    override def apply(c: HCursor): Decoder.Result[Subscribe] =
      for {
        correlationId <- c.downField(CorrelationIdField).as[CorrelationId]
        token <- c.downField(TokenField).as[Option[BearerToken]]
        channel <- c.downField(ChannelField).as[Channel]
      } yield Subscribe(correlationId, token, channel)
  }

  implicit object UnsubscribeCodec extends Codec[Unsubscribe] {
    override def apply(unsubscribe: Unsubscribe): Json = {
      val json = Json.obj(
        EventField -> Json.fromString(UnsubscribeKey),
        ChannelField -> unsubscribe.channel.asJson,
        CorrelationIdField -> unsubscribe.correlationId.asJson)
      unsubscribe.token match {
        case None        => json
        case Some(token) => json.mapObject(_.add(TokenField, token.asJson))
      }
    }

    override def apply(c: HCursor): Decoder.Result[Unsubscribe] =
      for {
        correlationId <- c.downField(CorrelationIdField).as[CorrelationId]
        token <- c.downField(TokenField).as[Option[BearerToken]]
        channel <- c.downField(ChannelField).as[Channel]
      } yield Unsubscribe(correlationId, token, channel)
  }

  implicit object SubscriptionSuccessCodec extends Codec[SubscriptionSuccess] {
    override def apply(c: HCursor): Decoder.Result[SubscriptionSuccess] =
      for {
        correlationId <- c.downField(CorrelationIdField).as[CorrelationId]
        channel <- c.downField(ChannelField).as[Channel]
      } yield SubscriptionSuccess(correlationId, channel)

    override def apply(ss: SubscriptionSuccess): Json =
      Json.obj(
        EventField -> Json.fromString(SubscriptionSuccessKey),
        CorrelationIdField -> ss.correlationId.asJson,
        ChannelField -> ss.channel.asJson)
  }

  implicit object SubscriptionFailureCodec extends Codec[SubscriptionFailure] {
    override def apply(c: HCursor): Decoder.Result[SubscriptionFailure] =
      for {
        correlationId <- c.downField(CorrelationIdField).as[CorrelationId]
        channel <- c.downField(ChannelField).as[Channel]
        errorCode <- c.downField(ErrorField).as[PresentationErrorCode]
      } yield SubscriptionFailure(correlationId, channel, errorCode)

    override def apply(sf: SubscriptionFailure): Json =
      Json.obj(
        EventField -> Json.fromString(SubscriptionFailureKey),
        CorrelationIdField -> sf.correlationId.asJson,
        ChannelField -> sf.channel.asJson,
        ErrorField -> sf.errorCode.asJson)
  }

  implicit object UnsubscriptionSuccessCodec extends Codec[UnsubscriptionSuccess] {
    override def apply(c: HCursor): Decoder.Result[UnsubscriptionSuccess] =
      for {
        correlationId <- c.downField(CorrelationIdField).as[CorrelationId]
        channel <- c.downField(ChannelField).as[Channel]
      } yield UnsubscriptionSuccess(correlationId, channel)

    override def apply(us: UnsubscriptionSuccess): Json =
      Json.obj(
        EventField -> Json.fromString(UnsubscriptionSuccessKey),
        CorrelationIdField -> us.correlationId.asJson,
        ChannelField -> us.channel.asJson)
  }

  implicit object UnsubscriptionFailureCodec extends Codec[UnsubscriptionFailure] {
    override def apply(c: HCursor): Decoder.Result[UnsubscriptionFailure] =
      for {
        correlationId <- c.downField(CorrelationIdField).as[CorrelationId]
        channel <- c.downField(ChannelField).as[Channel]
        errorCode <- c.downField(ErrorField).as[PresentationErrorCode]
      } yield UnsubscriptionFailure(correlationId, channel, errorCode)

    override def apply(uf: UnsubscriptionFailure): Json =
      Json.obj(
        EventField -> Json.fromString(UnsubscriptionFailureKey),
        CorrelationIdField -> uf.correlationId.asJson,
        ChannelField -> uf.channel.asJson,
        ErrorField -> uf.errorCode.asJson)
  }

  implicit object ErrorCodec extends Codec[Error] {
    override def apply(c: HCursor): Decoder.Result[Error] =
      c.downField(ErrorField).as[PresentationErrorCode].map(Error.apply)

    override def apply(error: Error): Json =
      Json.obj(EventField -> Json.fromString(ErrorKey), ErrorField -> error.errorCode.asJson)
  }

  implicit object FixtureUpdateCodec extends Codec[FixtureUpdate] {
    override def apply(c: HCursor): Decoder.Result[FixtureUpdate] =
      for {
        correlationId <- c.downField(CorrelationIdField).as[CorrelationId]
        channel <- c.downField(ChannelField).as[Channel]
        data <- c.downField(DataField).as[FixtureStateUpdate]
      } yield FixtureUpdate(correlationId, channel, data)

    override def apply(fu: FixtureUpdate): Json =
      Json.obj(EventField -> Json.fromString(UpdateKey), ChannelField -> fu.channel.asJson, DataField -> fu.data.asJson)
  }

  implicit object MarketUpdateCodec extends Codec[MarketUpdate] {
    override def apply(c: HCursor): Decoder.Result[MarketUpdate] =
      for {
        correlationId <- c.downField(CorrelationIdField).as[CorrelationId]
        channel <- c.downField(ChannelField).as[Channel]
        data <- c.downField(DataField).as[MarketStateUpdate]
      } yield MarketUpdate(correlationId, channel, data)

    override def apply(mu: MarketUpdate): Json =
      Json.obj(
        EventField -> Json.fromString(UpdateKey),
        CorrelationIdField -> mu.correlationId.asJson,
        ChannelField -> mu.channel.asJson,
        DataField -> mu.data.asJson)
  }

  implicit object BetUpdateCodec extends Codec[BetUpdate] {
    override def apply(c: HCursor): Decoder.Result[BetUpdate] =
      for {
        correlationId <- c.downField(CorrelationIdField).as[CorrelationId]
        channel <- c.downField(ChannelField).as[Channel]
        data <- c.downField(DataField).as[BetStateUpdate]
      } yield BetUpdate(correlationId, channel, data)

    override def apply(bu: BetUpdate): Json =
      Json.obj(
        EventField -> Json.fromString(UpdateKey),
        CorrelationIdField -> bu.correlationId.asJson,
        ChannelField -> bu.channel.asJson,
        DataField -> bu.data.asJson)
  }

  implicit object WalletUpdateCodec extends Codec[WalletUpdate] {
    override def apply(c: HCursor): Decoder.Result[WalletUpdate] =
      for {
        correlationId <- c.downField(CorrelationIdField).as[CorrelationId]
        channel <- c.downField(ChannelField).as[Channel]
        data <- c.downField(DataField).as[WalletStateUpdate]
      } yield WalletUpdate(correlationId, channel, data)

    override def apply(wu: WalletUpdate): Json =
      Json.obj(
        EventField -> Json.fromString(UpdateKey),
        CorrelationIdField -> wu.correlationId.asJson,
        ChannelField -> wu.channel.asJson,
        DataField -> wu.data.asJson)
  }

  implicit object IncomingMessageCodec extends Codec[IncomingMessage] {
    override def apply(im: IncomingMessage): Json =
      im match {
        case x: Heartbeat   => x.asJson
        case x: Subscribe   => x.asJson
        case x: Unsubscribe => x.asJson
      }

    override def apply(c: HCursor): Decoder.Result[IncomingMessage] =
      for {
        eventField <- c.downField(EventField).as[String]
        result <- eventField match {
          case HeartbeatKey   => c.as[Heartbeat]
          case SubscribeKey   => c.as[Subscribe]
          case UnsubscribeKey => c.as[Unsubscribe]
          case x =>
            c.fail(
              s"Expected 'event' field to be one of '$HeartbeatKey, $SubscribeKey, $UnsubscribeKey' but you sent me '$x'")
        }
      } yield result
  }

  implicit object OutgoingMessageCodec extends Codec[OutgoingMessage] {
    override def apply(c: HCursor): Decoder.Result[OutgoingMessage] =
      for {
        tpe <- c.downField(EventField).as[String]
        result <- tpe match {
          case HeartbeatKey             => c.as[Heartbeat]
          case ErrorKey                 => c.as[Error]
          case SubscriptionSuccessKey   => c.as[SubscriptionSuccess]
          case SubscriptionFailureKey   => c.as[SubscriptionFailure]
          case UnsubscriptionSuccessKey => c.as[UnsubscriptionSuccess]
          case UnsubscriptionFailureKey => c.as[UnsubscriptionFailure]
          case UpdateKey =>
            for {
              channel <- c.downField(ChannelField).as[Channel]
              res <- channel match {
                case _: HeartbeatChannel => c.as[Heartbeat]
                case _: BetsChannel      => c.as[BetUpdate]
                case _: WalletsChannel   => c.as[WalletUpdate]
                case _: MarketChannel    => c.as[MarketUpdate]
                case _: FixtureChannel   => c.as[FixtureUpdate]
              }
            } yield res
          case x =>
            c.fail(
              s"Expected message 'event' field to be one of '$HeartbeatKey, subscription, unsubscription' but you sent me '$x'")
        }
      } yield result

    override def apply(om: OutgoingMessage): Json =
      om match {
        case x: Heartbeat             => x.asJson
        case x: Error                 => x.asJson
        case x: SubscriptionSuccess   => x.asJson
        case x: SubscriptionFailure   => x.asJson
        case x: UnsubscriptionSuccess => x.asJson
        case x: UnsubscriptionFailure => x.asJson
        case x: FixtureUpdate         => x.asJson
        case x: MarketUpdate          => x.asJson
        case x: BetUpdate             => x.asJson
        case x: WalletUpdate          => x.asJson
      }
  }
}
