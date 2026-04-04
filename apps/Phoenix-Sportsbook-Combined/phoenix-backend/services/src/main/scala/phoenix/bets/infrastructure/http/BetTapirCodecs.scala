package phoenix.bets.infrastructure.http

import sttp.tapir.Codec

import phoenix.bets.BetEntity.BetId

object BetTapirCodecs {
  implicit val betIdCodec: Codec.PlainCodec[BetId] =
    Codec.string.map(BetId.apply _)(_.value)
}
