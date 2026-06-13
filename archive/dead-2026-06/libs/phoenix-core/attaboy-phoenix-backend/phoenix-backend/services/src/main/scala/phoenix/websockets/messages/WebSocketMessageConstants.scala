package phoenix.websockets.messages

object WebSocketMessageConstants {

  val ChannelSeparator = "^"
  val MessageSeparator = ":"

  val HeartbeatKey = "heartbeat"
  val SubscribeKey = "subscribe"
  val UnsubscribeKey = "unsubscribe"

  val EventField = "event"
  val CorrelationIdField = "correlationId"
  val TokenField = "token"
  val ChannelField = "channel"
  val ErrorField = "error"
  val DataField = "data"

  val FixtureChannelKey = "fixture"
  val MarketChannelKey = "market"
  val BetsChannelKey = "bets"
  val WalletsChannelKey = "wallets"
  val UnknownKey = "unknown"
  val ErrorKey = "error"
  val FailureKey = "failure"
  val SuccessKey = "success"
  val UpdateKey = "update"

  val SubscriptionSuccessKey = s"$SubscribeKey$MessageSeparator$SuccessKey"
  val SubscriptionFailureKey = s"$SubscribeKey$MessageSeparator$FailureKey"
  val UnsubscriptionSuccessKey = s"$UnsubscribeKey$MessageSeparator$SuccessKey"
  val UnsubscriptionFailureKey = s"$UnsubscribeKey$MessageSeparator$FailureKey"
}
