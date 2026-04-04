package phoenix.punters.infrastructure.http

import sttp.tapir.Codec

import phoenix.core.TimeUtils
import phoenix.core.ValidationTapirAdapter._
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.FirstName
import phoenix.punters.domain.LastName
import phoenix.punters.domain.Username

object PunterTapirCodecs {
  implicit val punterIdCodec: Codec.PlainCodec[PunterId] = Codec.string.map(PunterId.apply _)(_.value)
  implicit val firstNameCodec: Codec.PlainCodec[FirstName] =
    Codec.string.mapDecode(raw => FirstName(raw).toDecodeResult(raw))(_.value)
  implicit val lastNameCodec: Codec.PlainCodec[LastName] =
    Codec.string.mapDecode(raw => LastName(raw).toDecodeResult(raw))(_.value)
  implicit val dateOfBirthCodec: Codec.PlainCodec[DateOfBirth] =
    Codec.localDate.mapDecode(raw => DateOfBirth.from(raw).toDecodeResult(raw.toString))(_.toLocalDate)
  implicit val usernameCodec: Codec.PlainCodec[Username] =
    Codec.string.mapDecode(raw => Username(raw).toDecodeResult(raw))(_.value)
  implicit val dateCodec: Codec.PlainCodec[TimeUtils.Date] =
    Codec.localDate.map(TimeUtils.Date(_))(_.value)
}
