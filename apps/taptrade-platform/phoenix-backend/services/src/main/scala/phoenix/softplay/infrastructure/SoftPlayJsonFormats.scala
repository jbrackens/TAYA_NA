package phoenix.softplay.infrastructure

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

import phoenix.core.JsonFormats._
import phoenix.softplay.domain._

object SoftPlayJsonFormats {

  implicit val successfulRegistrationsCount: Codec[SuccessfulRegistrationsCount] =
    Codec[Int].bimap(_.value, SuccessfulRegistrationsCount.apply)

  implicit val unsuccessfulRegistrationsCount: Codec[UnsuccessfulRegistrationsCount] =
    Codec[Int].bimap(_.value, UnsuccessfulRegistrationsCount.apply)

  implicit val puntersWithDepositLimitCount: Codec[PuntersWithDepositLimitCount] =
    Codec[Int].bimap(_.value, PuntersWithDepositLimitCount.apply)

  implicit val puntersWithSpendLimitCount: Codec[PuntersWithSpendLimitCount] =
    Codec[Int].bimap(_.value, PuntersWithSpendLimitCount.apply)

  implicit val excludedPuntersCount: Codec[ExcludedPuntersCount] =
    Codec[Int].bimap(_.value, ExcludedPuntersCount.apply)

  implicit val suspendedPuntersCount: Codec[SuspendedPuntersCount] =
    Codec[Int].bimap(_.value, SuspendedPuntersCount.apply)

  implicit val sportSummaryCodec: Codec[SoftPlayReport] = deriveCodec
}
