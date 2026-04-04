package phoenix.punters.infrastructure

import java.time.LocalDate
import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Try

import akka.NotUsed
import akka.stream.scaladsl.Source
import cats.data.EitherT
import cats.data.NonEmptyList
import cats.data.OptionT
import cats.data.Validated
import cats.syntax.applicativeError._
import cats.syntax.apply._
import cats.syntax.functor._
import cats.syntax.traverse._
import cats.syntax.validated._
import org.postgresql.util.PSQLException
import org.slf4j.LoggerFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape
import slick.lifted.Tag

import phoenix.core.HashedValue
import phoenix.core.SHA256
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.core.persistence.DBIOUtils._
import phoenix.core.persistence.DBUtils
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.core.persistence.PostgresConstraintPredicates.foreignKeyViolated
import phoenix.core.persistence.PostgresConstraintPredicates.uniquenessViolated
import phoenix.core.persistence.SlickCatsInterop
import phoenix.core.validation.Validation._
import phoenix.core.validation.ValidationException
import phoenix.http.core.IpAddress
import phoenix.projections.DomainMappers._
import phoenix.punters.PunterEntity._
import phoenix.punters.domain.Address
import phoenix.punters.domain.AddressLine
import phoenix.punters.domain.BettingPreferences
import phoenix.punters.domain.City
import phoenix.punters.domain.CommunicationPreferences
import phoenix.punters.domain.Country
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.DocumentNumber
import phoenix.punters.domain.Email
import phoenix.punters.domain.FirstName
import phoenix.punters.domain.Gender
import phoenix.punters.domain.IdDocument
import phoenix.punters.domain.IdDocumentType
import phoenix.punters.domain.LastName
import phoenix.punters.domain.LastSignInData
import phoenix.punters.domain.MobilePhoneNumber
import phoenix.punters.domain.PersonalName
import phoenix.punters.domain.Punter
import phoenix.punters.domain.PunterPersonalDetails
import phoenix.punters.domain.PunterSearch
import phoenix.punters.domain.PunterSettings
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.PuntersRepositoryErrors
import phoenix.punters.domain.PuntersRepositoryErrors.ChangePunterDetailsError
import phoenix.punters.domain.PuntersRepositoryErrors.PunterEmailAlreadyExists
import phoenix.punters.domain.PuntersRepositoryErrors.PunterIdAlreadyExists
import phoenix.punters.domain.PuntersRepositoryErrors.PunterIdNotFound
import phoenix.punters.domain.PuntersRepositoryErrors.PunterIdNotFoundInSettings
import phoenix.punters.domain.PuntersRepositoryErrors.PunterUsernameAlreadyExists
import phoenix.punters.domain.PuntersRepositoryErrors.RecordPunterError
import phoenix.punters.domain.PuntersRepositoryErrors.SSNAlreadyExists
import phoenix.punters.domain.PuntersRepositoryErrors.SetSSNError
import phoenix.punters.domain.RegistrationOutcome
import phoenix.punters.domain.SearchConfidence
import phoenix.punters.domain.SelfExcludedPunterSearch
import phoenix.punters.domain.SignInTimestamp
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.domain.State
import phoenix.punters.domain.TermsAcceptedVersion
import phoenix.punters.domain.TermsAgreement
import phoenix.punters.domain.Title
import phoenix.punters.domain.UserPreferences
import phoenix.punters.domain.Username
import phoenix.punters.domain.Zipcode
import phoenix.punters.exclusion.infrastructure.ExclusionPredicates.LiftedMatchingCandidate
import phoenix.punters.exclusion.infrastructure.ExclusionPredicates._
import phoenix.punters.infrastructure.PunterDomainMappers.mappedColumnTypeForEnum
import phoenix.punters.infrastructure.PunterPersonalDetailsTable.PunterDetailsRow
import phoenix.punters.infrastructure.PunterPersonalDetailsTable.PunterDetailsRow.PunterDetailsRow
import phoenix.punters.infrastructure.PunterRegistrationDataTable.RegistrationDataRow
import phoenix.punters.infrastructure.PunterSettingsTable.PunterSettingsRow
import phoenix.punters.infrastructure.PunterSettingsTable.PunterSettingsRow.PunterSettingsRow
import phoenix.punters.infrastructure.Queries.PunterTables
import phoenix.punters.infrastructure.Queries.PunterTablesDetailsSettingsSsn
import phoenix.punters.infrastructure.SSNTable.SSNRow
import phoenix.punters.infrastructure.SSNTable.SSNRow.SSNRow
import phoenix.utils.cryptography.EncryptedResult
import phoenix.utils.cryptography.Encryption
import phoenix.utils.cryptography.EncryptionPassword
import phoenix.utils.cryptography.EncryptionSlickMappers._
import phoenix.utils.cryptography.UnencryptedText

final class SlickPuntersRepository(
    dbConfig: DatabaseConfig[JdbcProfile],
    encryptionPassword: EncryptionPassword,
    additionalSsnLookup: PunterId => Future[Option[Last4DigitsOfSSN]])(implicit ec: ExecutionContext)
    extends PuntersRepository {

  import dbConfig._

  import SlickCatsInterop._

  private val log = LoggerFactory.getLogger(getClass)

  override def startPunterRegistration(
      punter: Punter,
      startedAt: OffsetDateTime): EitherT[Future, RecordPunterError, Unit] =
    registerWithRegistrationStatus(punter, PunterRegistrationDataTable.registrationStarted(punter.punterId, startedAt))

  override def markRegistrationFinished(
      punterId: PunterId,
      outcome: RegistrationOutcome,
      finishedAt: OffsetDateTime): EitherT[Future, PunterIdNotFound.type, Unit] = {
    val updateStatement = Queries.registrationData
      .filter(_.punterId === punterId)
      .update(PunterRegistrationDataTable.registrationFinished(punterId, outcome, finishedAt))

    EitherT.liftF(db.run(updateStatement)).ensureOr(_ => PunterIdNotFound)(updatedRows => updatedRows == 1).void
  }

  override def getRegisteredAt(punterId: PunterId): Future[Option[OffsetDateTime]] = {
    val selectStatement =
      Queries.registrationData.filter(t => t.punterId === punterId).map(_.updatedAt).result.headOption
    db.run(selectStatement)
  }

  override def register(punter: Punter, finishedAt: OffsetDateTime): EitherT[Future, RecordPunterError, Unit] =
    registerWithRegistrationStatus(
      punter,
      PunterRegistrationDataTable.registrationFinished(punter.punterId, RegistrationOutcome.Successful, finishedAt))

  private def registerWithRegistrationStatus(
      punter: Punter,
      statusRow: RegistrationDataRow): EitherT[Future, RecordPunterError, Unit] = {
    val Punter(punterId, personalDetails, ssn, settings) = punter
    val personalDetailsEmailLowercased = personalDetails.copy(email = Email(personalDetails.email.value.toLowerCase))
    val insertAttempt = for {
      _ <- Queries.registrationData.insertOrUpdate(statusRow)
      _ <- Queries.punters += PunterDetailsRow.fromPersonalDetails(encryptionPassword)(
          punterId,
          personalDetailsEmailLowercased)
      _ <- ssn match {
        case Right(fullSSN) =>
          Queries.punterSsns.insertOrUpdate(SSNRow.fromFullSSN(encryptionPassword)(punterId, fullSSN))
        case Left(last4DigitsOfSSN) => Queries.punterSsns += (punterId, None, None, last4DigitsOfSSN)
      }
      _ <- Queries.punterSettings += PunterSettingsRow.fromPunterSettings(punterId, settings)
    } yield ()

    db.run(insertAttempt.transactionally).attemptT.leftMap {
      case error: PSQLException if uniquenessViolated(error, PunterPersonalDetailsTable.uniquePunterIdConstraint) =>
        PunterIdAlreadyExists

      case error: PSQLException if uniquenessViolated(error, PunterPersonalDetailsTable.uniqueUsernameConstraint) =>
        PunterUsernameAlreadyExists

      case error: PSQLException if uniquenessViolated(error, PunterPersonalDetailsTable.uniqueEmailConstraint) =>
        PunterEmailAlreadyExists

      case error: PSQLException if uniquenessViolated(error, SSNTable.uniqueSSNConstraint) =>
        SSNAlreadyExists

      case other =>
        throw other
    }
  }

  override def setSSN(punterId: PunterId, ssn: FullSSN): EitherT[Future, SetSSNError, Unit] = {
    db.run(Queries.punterSsns.insertOrUpdate(SSNRow.fromFullSSN(encryptionPassword)(punterId, ssn)))
      .attemptT
      .leftMap[SetSSNError] {
        case error: PSQLException if uniquenessViolated(error, SSNTable.uniqueSSNConstraint)      => SSNAlreadyExists
        case error: PSQLException if foreignKeyViolated(error, SSNTable.punterIdExistsConstraint) => PunterIdNotFound
        case other                                                                                => throw other
      }
      .void
  }

  override def updateDetails(
      punterId: PunterId,
      update: PunterPersonalDetails => PunterPersonalDetails): EitherT[Future, ChangePunterDetailsError, Unit] = {
    val punterQuery = Queries.punters.filter(_.punterId === punterId)
    val updateAttempt = for {
      existingRow <- punterQuery.result.head
      existingDetails <- DBIO.fromTry(PunterDetailsRow.toPersonalDetails(encryptionPassword)(existingRow))
      newDetails = update(existingDetails)
      newRow = PunterDetailsRow.fromPersonalDetails(encryptionPassword)(punterId, newDetails)
      _ <- punterQuery.update(newRow)
    } yield ()

    db.run(updateAttempt.transactionally).attemptT.leftMap {
      case _: NoSuchElementException =>
        PunterIdNotFound

      case error: PSQLException if foreignKeyViolated(error, PunterPersonalDetailsTable.punterIdExistsConstraint) =>
        PunterIdNotFound

      case error: PSQLException if uniquenessViolated(error, PunterPersonalDetailsTable.uniqueUsernameConstraint) =>
        PunterUsernameAlreadyExists

      case error: PSQLException if uniquenessViolated(error, PunterPersonalDetailsTable.uniqueEmailConstraint) =>
        PunterEmailAlreadyExists

      case other =>
        throw other
    }
  }

  override def updateSettings(punterId: PunterId, update: PunterSettings => PunterSettings)
      : EitherT[Future, PuntersRepositoryErrors.ChangePunterSettingsError, Unit] = {
    val query = Queries.punterSettings.filter(_.punterId === punterId)
    val updateAttempt = for {
      existingRow <- query.result.head
      existingSettings = PunterSettingsRow.toPunterSettings(existingRow)
      newSettings = update(existingSettings)
      newRow = PunterSettingsRow.fromPunterSettings(punterId, newSettings)
      _ <- query.update(newRow)
    } yield ()

    db.run(updateAttempt.transactionally).attemptT.leftMap {
      case _: NoSuchElementException => PunterIdNotFoundInSettings
      case other                     => throw other
    }
  }

  override def delete(punterId: PunterId): Future[Unit] =
    db.run(Queries.registrationData.filter(_.punterId === punterId).delete)
      .void // punters & ssns deleted in a cascaded manner

  override def deleteSSN(punterId: PunterId): Future[Int] =
    db.run(Queries.punterSsns.filter(_.punterId === punterId).delete)

  override def countPuntersWithStartedRegistration(): Future[Int] =
    db.run(Queries.registrationData.length.result)

  override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
    Queries.findPunterByIdQuery(punterId).mapK(runQuery(db)).semiflatMap(tables => toPunter(tables))

  override def findExcludedPunters(search: SelfExcludedPunterSearch): OptionT[Future, (Punter, SearchConfidence)] =
    Queries.exactMatchSearchQuery(search).orElse(Queries.closeMatchSearchQuery(search)).mapK(runQuery(db)).semiflatMap {
      case (tables, confidence) =>
        toPunter(tables).map(_ -> confidence)
    }

  override def findPuntersByFilters(search: PunterSearch, pagination: Pagination): Future[PaginatedResult[Punter]] = {
    val filteredPunterDetails =
      Queries.punters
        .filterOpt(search.punterId)((record, punterId) => record.punterId === punterId)
        .filterOpt(search.firstName)((record, firstName) => record.firstName === firstName.value)
        .filterOpt(search.lastName)((record, lastName) => record.lastName === lastName.value)
        .filterOpt(search.dateOfBirth)((record, dateOfBirth) => record.dateOfBirth === dateOfBirth.toLocalDate)
        .filterOpt(search.email)((record, email) => record.email === email.value)
        .filterOpt(search.username)((record, username) => record.userName === username.value)

    val filteredPunters = Queries.joinSettingsSsns(filteredPunterDetails)

    val databaseQuery = for {
      records <-
        filteredPunters
          .sortBy { case ((punterDetailsTable, _), _) => punterDetailsTable.punterId }
          .drop(pagination.offset)
          .take(pagination.itemsPerPage)
          .result
      totalCount <- filteredPunters.length.result
    } yield PaginatedResult(records, totalCount, pagination)

    db.run(databaseQuery).flatMap { paginatedResult =>
      paginatedResult.data.traverse(detailsSettingsSsntoPunter).map(punters => paginatedResult.copy(data = punters))
    }
  }

  override def getConfirmedPunters(): Source[Punter, NotUsed] =
    DBUtils
      .streamingSource(db, Queries.registeredPuntersQuery.result)
      .mapAsync(parallelism = 1)(tables => toPunter(tables))

  private def ssnLast4Lookup(
      maybeLast4DigitsOfSSN: Option[Last4DigitsOfSSN],
      punterId: PunterId): Future[Last4DigitsOfSSN] = {
    maybeLast4DigitsOfSSN match {
      case Some(ssn) => Future.successful(ssn)
      case _ =>
        log.warn(s"Punter punterId=$punterId does not have last4digits of ssn in DB")
        additionalSsnLookup(punterId).flatMap {
          case Some(ssn) => Future.successful(ssn)
          case _ =>
            log.error(s"Punter punterId=$punterId does not have last4digits of ssn in keycloak")
            Future.failed(new RuntimeException(s"Punter punterId=$punterId does not have last4digits of ssn"))
        }
    }
  }

  private case class PunterData(details: PunterPersonalDetails, maybeSSN: Option[FullSSN], settings: PunterSettings)

  private def convertRows(
      personalDetailsRow: PunterDetailsRow,
      punterSettingsRow: PunterSettingsRow,
      maybeSSNRow: Option[SSNRow]): Future[Punter] = {
    val punterId = personalDetailsRow._1
    val punterData: Try[PunterData] = for {
      personalDetails <- PunterDetailsRow.toPersonalDetails(encryptionPassword)(personalDetailsRow)
      maybeFullSSN <- maybeSSNRow.flatTraverse {
        case (_, _, maybeEncryptedResult, _) =>
          maybeEncryptedResult.traverse(encryptedResult => SSNRow.toFullSSN(encryptionPassword)(encryptedResult))
      }
    } yield PunterData(personalDetails, maybeFullSSN, PunterSettingsRow.toPunterSettings(punterSettingsRow))

    Future.fromTry(punterData).flatMap { row =>
      val eventualSsn = row.maybeSSN match {
        case Some(ssn) => Future.successful(Right(ssn))
        case _ =>
          ssnLast4Lookup(maybeSSNRow.map(_._4), punterId).map(Left(_))
      }
      eventualSsn.map { ssn =>
        Punter(punterId, row.details, ssn, row.settings)
      }
    }
  }

  private def toPunter(tables: PunterTables): Future[Punter] =
    tables match {
      case (((_, personalDetailsRow), punterSettingsRow), maybeSSNRow) =>
        convertRows(personalDetailsRow, punterSettingsRow, maybeSSNRow)
    }

  private def detailsSettingsSsntoPunter(tables: PunterTablesDetailsSettingsSsn): Future[Punter] =
    tables match {
      case ((personalDetailsRow, punterSettingsRow), maybeSSNRow) =>
        convertRows(personalDetailsRow, punterSettingsRow, maybeSSNRow)
    }

}

private object Queries {
  import phoenix.core.persistence.SlickCatsInterop._

  type PunterTables = (((RegistrationDataRow, PunterDetailsRow), PunterSettingsRow), Option[SSNRow])
  type PunterTablesDetailsSettingsSsn = ((PunterDetailsRow, PunterSettingsRow), Option[SSNRow])

  val punters = TableQuery[PunterPersonalDetailsTable]
  val punterSsns = TableQuery[SSNTable]
  val punterSettings = TableQuery[PunterSettingsTable]
  val registrationData = TableQuery[PunterRegistrationDataTable]

  val allPuntersQuery =
    registrationData
      .join(punters)
      .on { case (registration, punters) => registration.punterId === punters.punterId }
      .join(punterSettings)
      .on { case ((registration, _), settings) => registration.punterId === settings.punterId }
      .joinLeft(punterSsns)
      .on { case ((_, punters), ssns) => punters.punterId === ssns.punterId }

  def joinSettingsSsns(punterDetails: Query[PunterPersonalDetailsTable, PunterDetailsRow, Seq]): Query[
    ((PunterPersonalDetailsTable, PunterSettingsTable), Rep[Option[SSNTable]]),
    ((PunterDetailsRow, PunterSettingsRow), Option[SSNRow]),
    Seq] = {
    punterDetails
      .join(punterSettings)
      .on { case (detais, settings) => detais.punterId === settings.punterId }
      .joinLeft(punterSsns)
      .on { case ((details, _), ssns) => details.punterId === ssns.punterId }
  }

  val registeredPuntersQuery =
    allPuntersQuery.filter { case (((registration, _), _), _) => registration.isRegistrationFinished }

  def findPunterByIdQuery(punterId: PunterId): OptionT[DBIO, PunterTables] = {
    val query: DBIO[Option[PunterTables]] =
      allPuntersQuery.filter { case (((_, details), _), _) => details.punterId === punterId }.take(1).result.headOption

    OptionT(query)
  }

  def exactMatchSearchQuery(search: SelfExcludedPunterSearch)(implicit
      ec: ExecutionContext): OptionT[DBIO, (PunterTables, SearchConfidence)] = {
    val query: DBIO[Option[PunterTables]] =
      registeredPuntersQuery
        .filter { case (((_, details), _), ssn) => matchesExactly(convert(details, ssn), convert(search)) }
        .take(1)
        .result
        .headOption

    OptionT(query).map(_ -> SearchConfidence.ExactMatch)
  }

  def closeMatchSearchQuery(search: SelfExcludedPunterSearch)(implicit
      ec: ExecutionContext): OptionT[DBIO, (PunterTables, SearchConfidence)] = {
    val query: DBIO[Option[PunterTables]] =
      registeredPuntersQuery
        .filter { case (((_, details), _), ssn) => matchesClosely(convert(details, ssn), convert(search)) }
        .take(1)
        .result
        .headOption

    OptionT(query).map(_ -> SearchConfidence.CloseMatch)
  }

  private def convert(punter: PunterPersonalDetailsTable, ssn: Rep[Option[SSNTable]]): LiftedMatchingCandidate =
    LiftedMatchingCandidate(
      fullSSN = ssn.flatMap(_.hashedSSN),
      last4DigitsOfSSN = ssn.map(_.last4Digits),
      lastName = punter.lastName,
      dateOfBirth = punter.dateOfBirth)

  private def convert(search: SelfExcludedPunterSearch): MatchingCandidate =
    MatchingCandidate(
      fullSSN = EitherT(search.ssn).map(ssn => SHA256.hash(ssn.value)).collectRight,
      last4DigitsOfSSN = EitherT(search.ssn).fold(identity, _.last4Digits),
      lastName = search.name.value,
      dateOfBirth = search.dateOfBirth.toLocalDate)
}

private class PunterPersonalDetailsTable(tag: Tag)
    extends Table[PunterDetailsRow](tag, PunterPersonalDetailsTable.tableName) {

  import PunterPersonalDetailsDataMappers._

  def punterId = column[PunterId]("punter_id", O.PrimaryKey)
  def userName = column[String]("username")
  def title = column[String]("name_title")
  def firstName = column[String]("first_name")
  def lastName = column[String]("last_name")
  def email = column[String]("email")
  def phone = column[String]("phone")
  def addressLine = column[String]("address_line")
  def city = column[String]("city")
  def state = column[String]("state")
  def zipcode = column[String]("zipcode")
  def country = column[String]("country")
  def dateOfBirth = column[LocalDate]("date_of_birth")
  def gender = column[Option[String]]("gender")
  def isTestAccount = column[Boolean]("is_test_account")
  def documentType = column[Option[IdDocumentType]]("document_type")
  def documentNumber = column[Option[EncryptedResult]]("document_number")
  def isPhoneNumberVerified = column[Boolean]("is_phone_number_verified")

  override def * : ProvenShape[PunterDetailsRow] =
    (
      punterId,
      userName,
      (title, firstName, lastName),
      email,
      phone,
      (addressLine, city, state, zipcode, country),
      dateOfBirth,
      gender,
      isTestAccount,
      (documentType, documentNumber),
      isPhoneNumberVerified)
}

private object PunterPersonalDetailsTable {
  val tableName = "punter_personal_details"
  val uniquePunterIdConstraint = s"${tableName}_pkey"
  val uniqueUsernameConstraint = s"${tableName}_username_key"
  val uniqueEmailConstraint = s"${tableName}_email_key"
  val punterIdExistsConstraint = s"${tableName}_punter_id_fk"

  object PunterDetailsRow {
    type PunterDetailsRow =
      (
          PunterId,
          String,
          (String, String, String),
          String,
          String,
          (String, String, String, String, String),
          LocalDate,
          Option[String],
          Boolean,
          (Option[IdDocumentType], Option[EncryptedResult]),
          Boolean)

    def fromPersonalDetails(encryptionPassword: EncryptionPassword)(
        punterId: PunterId,
        punterDetails: PunterPersonalDetails): PunterDetailsRow =
      (
        punterId,
        punterDetails.userName.value,
        (punterDetails.name.title.value, punterDetails.name.firstName.value, punterDetails.name.lastName.value),
        punterDetails.email.value,
        punterDetails.phoneNumber.value,
        (
          punterDetails.address.addressLine.value,
          punterDetails.address.city.value,
          punterDetails.address.state.value,
          punterDetails.address.zipcode.value,
          punterDetails.address.country.value),
        punterDetails.dateOfBirth.toLocalDate,
        punterDetails.gender.map(_.entryName),
        punterDetails.isTestAccount,
        (
          punterDetails.document.map(_.documentType),
          punterDetails.document.map(d => Encryption.encrypt(UnencryptedText(d.number.value), encryptionPassword))),
        punterDetails.isPhoneNumberVerified)

    def toPersonalDetails(encryptionPassword: EncryptionPassword)(row: PunterDetailsRow): Try[PunterPersonalDetails] =
      row match {
        case (
              _,
              userName,
              (title, firstName, lastName),
              emailString,
              phoneString,
              (addressLine, city, state, zipcode, country),
              dob,
              genderString,
              isTestAccount,
              (documentType, documentNumber),
              isPhoneNumberVerified) =>
          val username = Username(userName)
          val name = (Title(title), FirstName(firstName), LastName(lastName)).mapN(PersonalName)
          val email = Email.fromString(emailString)
          val phone = MobilePhoneNumber(phoneString).validNel
          val address =
            (AddressLine(addressLine), City(city), State(state), Zipcode(zipcode), Country(country)).mapN(Address)
          val dateOfBirth = DateOfBirth.from(dob)
          val gender = genderString.traverse(Gender.fromString)

          val decryptedNumber = Validated
            .fromEither(documentNumber.traverse(Encryption.decrypt(_, encryptionPassword)))
            .leftMap(_ => NonEmptyList.one(ValidationException("Could not decrypt document number")))
            .andThen(maybeDecryptedNumber => maybeDecryptedNumber.traverse(DocumentNumber.fromUnencryptedText))

          val document = (documentType.validNel, decryptedNumber).mapN {
            case (maybeDocumentType, maybeNumber) => (maybeDocumentType, maybeNumber).mapN(IdDocument)
          }

          (username, name, email, phone, address, dateOfBirth, gender, document)
            .mapN(PunterPersonalDetails(_, _, _, _, _, _, _, isTestAccount, _, isPhoneNumberVerified))
            .toTryCombined
      }
  }
}

private object PunterPersonalDetailsDataMappers {
  implicit val idDocumentTypeMapper: BaseColumnType[IdDocumentType] =
    mappedColumnTypeForEnum(IdDocumentType)

}

private final class SSNTable(tag: Tag) extends Table[SSNRow](tag, SSNTable.tableName) {
  def punterId: Rep[PunterId] = column[PunterId]("punter_id", O.PrimaryKey)
  def hashedSSN: Rep[Option[HashedValue]] = column[Option[HashedValue]]("hashed_ssn", O.Unique)
  def encryptedSSN: Rep[Option[EncryptedResult]] = column[Option[EncryptedResult]]("encrypted_ssn")
  def last4Digits: Rep[Last4DigitsOfSSN] = column[Last4DigitsOfSSN]("last_4_ssn_digits")

  def * = (punterId, hashedSSN, encryptedSSN, last4Digits)
}

private object SSNTable {
  val tableName = "punter_ssns"
  val uniquePunterIdConstraint = s"${tableName}_pkey"
  val uniqueSSNConstraint = s"${tableName}_hashed_ssn_key"
  val punterIdExistsConstraint = s"${tableName}_punter_id_fk"

  object SSNRow {
    type SSNRow = (PunterId, Option[HashedValue], Option[EncryptedResult], Last4DigitsOfSSN)

    def fromFullSSN(encryptionPassword: EncryptionPassword)(punterId: PunterId, ssn: FullSSN): SSNRow =
      (
        punterId,
        Some(SHA256.hash(ssn.value)),
        Some(Encryption.encrypt(UnencryptedText(ssn.value), encryptionPassword)),
        ssn.last4Digits)

    def toFullSSN(encryptionPassword: EncryptionPassword)(encryptedText: EncryptedResult): Try[FullSSN] =
      for {
        decrypted <- Encryption.decrypt(encryptedText, encryptionPassword).toTry
        ssn <- FullSSN.fromString(decrypted.value).toTryCombined
      } yield ssn
  }
}

private final class PunterSettingsTable(tag: Tag) extends Table[PunterSettingsRow](tag, PunterSettingsTable.tableName) {
  def punterId = column[PunterId]("punter_id", O.PrimaryKey)
  def lastSignInTimestamp = column[Option[OffsetDateTime]]("last_sign_in_timestamp")
  def lastSignInIp = column[Option[String]]("last_sign_in_ip")
  def mfaEnabled = column[Option[Boolean]]("mfa_enabled")
  def migratedKeycloakDbSet1 = column[Boolean]("migrated_keycloak_db_set1")
  def prefAnnouncements = column[Boolean]("pref_announcements")
  def prefAutoAcceptBetterOdds = column[Boolean]("pref_auto_accept_better_odds")
  def prefPromotions = column[Boolean]("pref_promotions")
  def prefSignInNotifications = column[Boolean]("pref_sign_in_notifications")
  def prefSubscriptionUpdates = column[Boolean]("pref_subscription_updates")
  def keycloakMigrationVersion = column[Int]("keycloak_migration_version")
  def termsAcceptedAt = column[OffsetDateTime]("terms_accepted_at")
  def termsAcceptedVersion = column[Int]("terms_accepted_version")
  def signUpDate = column[OffsetDateTime]("sign_up_date")
  def isRegistrationVerified = column[Boolean]("is_registration_verified")
  def isAccountVerified = column[Boolean]("is_account_verified")

  override def * : ProvenShape[PunterSettingsRow] =
    (
      punterId,
      lastSignInTimestamp,
      lastSignInIp,
      mfaEnabled,
      migratedKeycloakDbSet1,
      prefAnnouncements,
      prefAutoAcceptBetterOdds,
      prefPromotions,
      prefSignInNotifications,
      prefSubscriptionUpdates,
      keycloakMigrationVersion,
      termsAcceptedAt,
      termsAcceptedVersion,
      signUpDate,
      isRegistrationVerified,
      isAccountVerified)
}

private object PunterSettingsTable {
  val tableName = "punter_settings"
  val uniquePunterIdConstraint = s"${tableName}_pkey"
  val punterIdExistsConstraint = s"${tableName}_punter_id_fk"

  object PunterSettingsRow {
    type PunterSettingsRow = (
        PunterId,
        Option[OffsetDateTime],
        Option[String],
        Option[Boolean],
        Boolean,
        Boolean,
        Boolean,
        Boolean,
        Boolean,
        Boolean,
        Int,
        OffsetDateTime,
        Int,
        OffsetDateTime,
        Boolean,
        Boolean)
    val migratedToDb = true
    val keycloakMigrationVersion = 3;

    def fromPunterSettings(punterId: PunterId, punterSettings: PunterSettings): PunterSettingsRow =
      (
        punterId,
        punterSettings.lastSignIn.map(_.timestamp.value),
        punterSettings.lastSignIn.map(_.ipAddress.value),
        Some(punterSettings.mfaEnabled),
        migratedToDb,
        punterSettings.userPreferences.communicationPreferences.announcements,
        punterSettings.userPreferences.bettingPreferences.autoAcceptBetterOdds,
        punterSettings.userPreferences.communicationPreferences.promotions,
        punterSettings.userPreferences.communicationPreferences.signInNotifications,
        punterSettings.userPreferences.communicationPreferences.subscriptionUpdates,
        keycloakMigrationVersion,
        punterSettings.termsAgreement.acceptedAt,
        punterSettings.termsAgreement.version.value,
        punterSettings.signUpDate,
        punterSettings.isRegistrationVerified,
        punterSettings.isAccountVerified)

    def toPunterSettings(row: PunterSettingsRow): PunterSettings =
      row match {
        case (
              _,
              lastSignInTimestamp,
              lastSignInIp,
              mfaEnabled,
              _,
              prefAnnouncements,
              prefAutoAcceptBetterOdds,
              prefPromotions,
              prefSignInNotifications,
              prefSubscriptionUpdates,
              _,
              acceptedAt,
              termsVersion,
              signUpDate,
              isRegistrationVerified,
              isAccountVerified) =>
          val maybeSignInData = for {
            tst <- lastSignInTimestamp
            ip <- lastSignInIp
          } yield LastSignInData(SignInTimestamp(tst), IpAddress(ip))
          PunterSettings(
            maybeSignInData,
            UserPreferences(
              CommunicationPreferences(
                prefAnnouncements,
                prefPromotions,
                prefSubscriptionUpdates,
                prefSignInNotifications),
              BettingPreferences(prefAutoAcceptBetterOdds)),
            TermsAgreement(TermsAcceptedVersion(termsVersion), acceptedAt),
            signUpDate,
            isRegistrationVerified,
            isAccountVerified,
            mfaEnabled.getOrElse(true))
      }
  }

}

private final class PunterRegistrationDataTable(tag: Tag)
    extends Table[RegistrationDataRow](tag, PunterRegistrationDataTable.tableName) {

  import PunterRegistrationDataMappers._

  def punterId: Rep[PunterId] = column[PunterId]("punter_id", O.PrimaryKey)
  def isRegistrationFinished: Rep[Boolean] = column[Boolean]("is_finished")
  def outcome: Rep[Option[RegistrationOutcome]] = column[Option[RegistrationOutcome]]("registration_outcome")
  def updatedAt: Rep[OffsetDateTime] = column[OffsetDateTime]("updated_at")

  override def * = (punterId, isRegistrationFinished, outcome, updatedAt)
}

private object PunterRegistrationDataTable {
  val tableName = "punter_registration_data"

  type RegistrationDataRow = (PunterId, Boolean, Option[RegistrationOutcome], OffsetDateTime)

  def registrationStarted(punterId: PunterId, registrationStartedAt: OffsetDateTime): RegistrationDataRow = {
    val registrationFinished = false
    val registrationOutcome = None
    (punterId, registrationFinished, registrationOutcome, registrationStartedAt)
  }

  def registrationFinished(
      punterId: PunterId,
      outcome: RegistrationOutcome,
      registrationCompletedAt: OffsetDateTime): RegistrationDataRow = {
    val registrationFinished = true
    (punterId, registrationFinished, Some(outcome), registrationCompletedAt)
  }
}

private object PunterRegistrationDataMappers {
  implicit val registrationOutcomeMapper: BaseColumnType[RegistrationOutcome] =
    mappedColumnTypeForEnum(RegistrationOutcome)
}
