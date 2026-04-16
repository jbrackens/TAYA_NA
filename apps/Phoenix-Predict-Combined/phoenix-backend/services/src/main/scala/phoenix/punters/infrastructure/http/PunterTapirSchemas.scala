package phoenix.punters.infrastructure.http

import sttp.tapir.Schema
import sttp.tapir.SchemaType.SInteger

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.ReferralCode
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.domain.City
import phoenix.punters.domain.Country
import phoenix.punters.domain.FirstName
import phoenix.punters.domain.LastName
import phoenix.punters.domain.MobilePhoneNumber
import phoenix.punters.domain.MultifactorVerificationCode
import phoenix.punters.domain.MultifactorVerificationId
import phoenix.punters.domain.RefreshToken
import phoenix.punters.domain.State
import phoenix.punters.domain.TermsAcceptedVersion
import phoenix.punters.domain.Title
import phoenix.punters.domain.Username
import phoenix.punters.domain.Zipcode

object PunterTapirSchemas {
  implicit val citySchema: Schema[City] = Schema.string

  implicit val countrySchema: Schema[Country] = Schema.string

  implicit val titleSchema: Schema[Title] = Schema.string

  implicit val firstNameSchema: Schema[FirstName] = Schema.string

  implicit val lastNameSchema: Schema[LastName] = Schema.string

  implicit val mobilePhoneNumberSchema: Schema[MobilePhoneNumber] = Schema.string

  implicit val multifactorVerificationIdSchema: Schema[MultifactorVerificationId] = Schema.string

  implicit val multifactorVerificationCodeSchema: Schema[MultifactorVerificationCode] = Schema.string

  implicit val punterIdSchema: Schema[PunterId] = Schema.string

  implicit val referralSchema: Schema[ReferralCode] = Schema.string

  implicit val refreshTokenSchema: Schema[RefreshToken] = Schema.string

  implicit val sessionIdSchema: Schema[SessionId] = Schema.string

  implicit val stateSchema: Schema[State] = Schema.string

  implicit val termsAcceptedVersionSchema: Schema[TermsAcceptedVersion] = Schema(SInteger())

  implicit val usernameSchema: Schema[Username] = Schema.string

  implicit val zipcodeSchema: Schema[Zipcode] = Schema.string
}
