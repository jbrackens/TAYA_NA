package phoenix.dbviews.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.syntax.apply._
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape
import slick.lifted.TableQuery
import slick.lifted.Tag

import phoenix.core.Clock
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.core.validation.Validation._
import phoenix.dbviews.domain.model._
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.Address
import phoenix.punters.domain.AddressLine
import phoenix.punters.domain.City
import phoenix.punters.domain.Country
import phoenix.punters.domain.DUPI
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.Email
import phoenix.punters.domain.FirstName
import phoenix.punters.domain.Gender
import phoenix.punters.domain.LastName
import phoenix.punters.domain.MobilePhoneNumber
import phoenix.punters.domain.PersonalName
import phoenix.punters.domain.PunterPersonalDetails
import phoenix.punters.domain.State
import phoenix.punters.domain.Title
import phoenix.punters.domain.Username
import phoenix.punters.domain.Zipcode

final class SlickView01PatronDetailsRepository(dbConfig: DatabaseConfig[JdbcProfile], easternClock: Clock)(implicit
    ec: ExecutionContext)
    extends View01PatronDetailsRepository {
  import dbConfig.db
  import SlickView01PatronDetailsRepository._
  import PatronDetailsWithEasternTime.withEasternTime
  private val patronDetailsQuery: TableQuery[PatronDetailsTable] = TableQuery[PatronDetailsTable]

  override def upsert(patronDetails: PatronDetails): Future[Unit] =
    db.run(patronDetailsQuery.insertOrUpdate(withEasternTime(patronDetails, easternClock))).map(_ => ())

  override def updateDetails(punterId: PunterId, update: PunterPersonalDetails => PunterPersonalDetails): Future[Unit] =
    get(punterId).flatMap {
      case Some(patronDetails) =>
        upsert(patronDetails.copy(personal = update(patronDetails.personal)))
      case None => Future(())
    }

  override def get(punterId: PunterId): Future[Option[PatronDetails]] =
    db.run(patronDetailsQuery.filter(_.patronAccountId === punterId.value).result.headOption)
      .map(_.map(_.patronDetails))
}
object SlickView01PatronDetailsRepository {
  import SlickViewMappers._
  final case class PatronDetailsWithEasternTime(
      patronDetails: PatronDetails,
      registrationTimeEastern: OffsetDateTime,
      kycVerificationTimeEastern: OffsetDateTime,
      lastUpdateTimeEastern: OffsetDateTime)
  object PatronDetailsWithEasternTime {
    def withEasternTime(patronDetails: PatronDetails, easternClock: Clock): PatronDetailsWithEasternTime =
      PatronDetailsWithEasternTime(
        patronDetails = patronDetails,
        registrationTimeEastern = easternClock.adjustToClockZone(patronDetails.registration.registrationTime),
        kycVerificationTimeEastern = easternClock.adjustToClockZone(patronDetails.kyc.kycVerificationTime),
        lastUpdateTimeEastern = easternClock.adjustToClockZone(patronDetails.lastUpdateTime))
  }
  final class PatronDetailsTable(tag: Tag) extends Table[PatronDetailsWithEasternTime](tag, "vNJDGE01PATRONDETAILS") {
    type RegistrationInfoRows = (String, String, Option[String], Option[String], Option[String], Option[String])
    type PersonalDetailRows = (String, String, String, String, String, String, String, String)
    type KYCDetailRows = (KYCVerificationMethod, KYCVerificationStatus, String, String)
    type TableRow = (
        String,
        String,
        Option[String],
        String,
        String,
        String,
        String,
        Option[String],
        String,
        Option[String],
        RegistrationInfoRows,
        PersonalDetailRows,
        KYCDetailRows,
        String,
        String)
    def skinName = column[String]("SKIN_NAME")
    def patronAccountId = column[String]("PATRON_ACCOUNT_ID")
    def patronUserName = column[Option[String]]("PATRON_USER_NAME")
    def geoId = column[String]("GEO_ID")
    def dupi = column[String]("DUPI")
    def firstName = column[String]("FIRST_NAME")
    def lastName = column[String]("LAST_NAME")
    def middleInitial = column[Option[String]]("MIDDLE_INITIAL")
    def dob = column[String]("DOB")
    def gender = column[Option[String]]("GENDER")
    def registrationTimeSystem = column[String]("REGISTRATION_TIME_SYSTEM")
    def registrationTimeEastern = column[String]("REGISTRATION_TIME_EASTERN")
    def registrationUsState = column[Option[String]]("REGISTRATION_US_STATE")
    def registrationUsZipcode = column[Option[String]]("REGISTRATION_US_ZIPCODE")
    def registrationNonUsState = column[Option[String]]("REGISTRATION_NON_US_STATE")
    def registrationCountry = column[Option[String]]("REGISTRATION_COUNTRY")
    def patronContactEmail = column[String]("PATRON_CONTACT_EMAIL")
    def patronContactPhone = column[String]("PATRON_CONTACT_PHONE")
    def patronPrimaryAddress1 = column[String]("PATRON_PRIMARY_ADDRESS1")
    def patronPrimaryAddress2 = column[String]("PATRON_PRIMARY_ADDRESS2")
    def patronPrimaryCity = column[String]("PATRON_PRIMARY_CITY")
    def patronPrimaryZipcode = column[String]("PATRON_PRIMARY_ZIPCODE")
    def patronPrimaryState = column[String]("PATRON_PRIMARY_STATE")
    def patronPrimaryCountry = column[String]("PATRON_PRIMARY_COUNTRY")
    def kycVerificationMethod = column[KYCVerificationMethod]("KYC_VERIFICATION_METHOD")
    def kycVerificationStatus = column[KYCVerificationStatus]("KYC_VERIFICATION_STATUS")
    def kycVerificationTimeSystem = column[String]("KYC_VERIFICATION_TIME_SYSTEM")
    def kycVerificationTimeEastern = column[String]("KYC_VERIFICATION_TIME_EASTERN")
    def lastUpdateTimeSystem = column[String]("LAST_UPDATE_TIME_SYSTEM")
    def lastUpdateTimeEastern = column[String]("LAST_UPDATE_TIME_EASTERN")
    def pk = primaryKey("pk_01", (patronAccountId, dupi))
    override def * : ProvenShape[PatronDetailsWithEasternTime] =
      (
        skinName,
        patronAccountId,
        patronUserName,
        geoId,
        dupi,
        firstName,
        lastName,
        middleInitial,
        dob,
        gender,
        (
          registrationTimeSystem,
          registrationTimeEastern,
          registrationUsState,
          registrationUsZipcode,
          registrationNonUsState,
          registrationCountry),
        (
          patronContactEmail,
          patronContactPhone,
          patronPrimaryAddress1,
          patronPrimaryAddress2,
          patronPrimaryCity,
          patronPrimaryZipcode,
          patronPrimaryState,
          patronPrimaryCountry),
        (kycVerificationMethod, kycVerificationStatus, kycVerificationTimeSystem, kycVerificationTimeEastern),
        lastUpdateTimeSystem,
        lastUpdateTimeEastern) <> (fromTableRow, toTableRow)

    private def fromTableRow(row: TableRow): PatronDetailsWithEasternTime =
      row match {
        case (
              _,
              patronAccountId,
              patronUserName,
              geoId,
              dupi,
              patronFirstName,
              patronLastName,
              _,
              patronDob,
              patronGender,
              (
                registrationTimeSystem,
                registrationTimeEastern,
                registrationUsState,
                registrationUsZipcode,
                _,
                registrationCountry),
              (
                patronContactEmail,
                patronContactPhone,
                patronPrimaryAddress1,
                _,
                patronPrimaryCity,
                patronPrimaryZipcode,
                patronPrimaryState,
                patronPrimaryCountry),
              (kycVerificationMethod, kycVerificationStatus, kycVerificationTimeSystem, kycVerificationTimeEastern),
              lastUpdateTimeSystem,
              lastUpdateTimeEastern) => {

          val userName = patronUserName.map(u => Username(u).toTryCombined.get)
          val (title, firstName, lastName, dob, gender): (Title, FirstName, LastName, DateOfBirth, Option[Gender]) =
            (Title("-"), FirstName(patronFirstName), LastName(patronLastName), Constants.parseDateOfBirth(patronDob))
              .mapN((_, _, _, _, patronGender.map(Constants.parseGender(_))))
              .toTryCombined
              .get

          val punterRegistrationDetails =
            PatronRegistrationDetails(
              registrationTime = OffsetDateTime.parse(registrationTimeSystem, Constants.dateTimePattern),
              state = registrationUsState.map(State(_).toTryCombined.get),
              zipcode = registrationUsZipcode.map(Zipcode(_).toTryCombined.get),
              nonUsState = None,
              country = registrationCountry.map(Country(_).toTryCombined.get))

          val punterPersonalDetails = (
            AddressLine(patronPrimaryAddress1),
            City(patronPrimaryCity),
            Zipcode(patronPrimaryZipcode),
            State(patronPrimaryState),
            Country(patronPrimaryCountry))
            .mapN({
              case (addressLine, city, zipcode, state, country) =>
                PunterPersonalDetails(
                  email = Email(patronContactEmail),
                  phoneNumber = MobilePhoneNumber(patronContactPhone),
                  isTestAccount = false,
                  document = None,
                  userName = userName.get,
                  name = PersonalName(title, firstName, lastName),
                  dateOfBirth = dob,
                  gender = gender,
                  address = Address(addressLine, city, state, zipcode, country),
                  isPhoneNumberVerified = false)
            })
            .toTryCombined
            .get

          PatronDetailsWithEasternTime(
            PatronDetails(
              punterId = PunterId(patronAccountId),
              geoId = geoId,
              dupi = DUPI(dupi),
              registration = punterRegistrationDetails,
              personal = punterPersonalDetails,
              kyc = PatronKYCDetails(
                kycVerificationMethod = kycVerificationMethod,
                kycVerificationStatus = kycVerificationStatus,
                kycVerificationTime = OffsetDateTime.parse(kycVerificationTimeSystem, Constants.dateTimePattern)),
              lastUpdateTime = OffsetDateTime.parse(lastUpdateTimeSystem, Constants.dateTimePattern)),
            registrationTimeEastern = OffsetDateTime.parse(registrationTimeEastern, Constants.dateTimePattern),
            kycVerificationTimeEastern = OffsetDateTime.parse(kycVerificationTimeEastern, Constants.dateTimePattern),
            lastUpdateTimeEastern = OffsetDateTime.parse(lastUpdateTimeEastern, Constants.dateTimePattern))
        }
      }
    private def toTableRow(patronDetailsWithEasternTime: PatronDetailsWithEasternTime): Option[TableRow] = {
      val patronDetails = patronDetailsWithEasternTime.patronDetails
      val address2 = ""
      val geoId = None
      Some(
        (
          Constants.skinName,
          patronDetails.punterId.value,
          Some(patronDetails.personal.userName.value),
          patronDetails.geoId,
          patronDetails.dupi.value,
          patronDetails.personal.name.firstName.value,
          patronDetails.personal.name.lastName.value,
          geoId,
          Constants.formatDateOfBirth(patronDetails.personal.dateOfBirth),
          patronDetails.personal.gender.map(Constants.formatGender(_)),
          (
            patronDetails.registration.registrationTime.format(Constants.dateTimePattern),
            patronDetailsWithEasternTime.registrationTimeEastern.format(Constants.dateTimePattern),
            patronDetails.registration.state.map(_.value),
            patronDetails.registration.zipcode.map(_.value),
            patronDetails.registration.nonUsState,
            patronDetails.registration.country.map(_.value)),
          (
            patronDetails.personal.email.value,
            patronDetails.personal.phoneNumber.value,
            patronDetails.personal.address.addressLine.value,
            address2,
            patronDetails.personal.address.city.value,
            patronDetails.personal.address.zipcode.value,
            patronDetails.personal.address.state.value,
            patronDetails.personal.address.country.value),
          (
            patronDetails.kyc.kycVerificationMethod,
            patronDetails.kyc.kycVerificationStatus,
            patronDetails.kyc.kycVerificationTime.format(Constants.dateTimePattern),
            patronDetailsWithEasternTime.kycVerificationTimeEastern.format(Constants.dateTimePattern)),
          patronDetails.lastUpdateTime.format(Constants.dateTimePattern),
          patronDetailsWithEasternTime.lastUpdateTimeEastern.format(Constants.dateTimePattern)))
    }
  }
}
