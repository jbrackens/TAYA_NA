package phoenix.punters.support

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.NotUsed
import akka.stream.scaladsl.Source
import cats.data.EitherT
import cats.data.OptionT
import cats.implicits.toBifunctorOps
import monocle.Monocle.toAppliedFocusOps
import org.apache.commons.text.similarity.LevenshteinDistance
import org.slf4j.LoggerFactory

import phoenix.core.OptionUtils.OptionOps
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.Email
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
import phoenix.punters.domain.SocialSecurityNumber.FullOrPartialSSN
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.domain.SocialSecurityNumberOps.FullOrPartialSSNConverters
import phoenix.punters.domain.Username
import phoenix.punters.exclusion.domain.NormalizedLastName
import phoenix.support.FutureSupport

class InMemoryPuntersRepository(additionalSSNLookup: PunterId => Future[Option[Last4DigitsOfSSN]] = _ =>
  Future.successful(None))(implicit ec: ExecutionContext)
    extends PuntersRepository {
  private val MAX_LEVENSHTEIN_DISTANCE = 1
  private val distance = new LevenshteinDistance(MAX_LEVENSHTEIN_DISTANCE + 1)

  private val log = LoggerFactory.getLogger(getClass)

  var punterDetails: Map[PunterId, PunterPersonalDetails] = Map.empty
  case class FullAndPartialSSN(fullSSn: Option[FullSSN], last4DigitsOfSSN: Last4DigitsOfSSN) {
    def toFullOrPartialSSN(): FullOrPartialSSN = this.fullSSn.toRight(this.last4DigitsOfSSN)
  }
  var punterSsns: Map[PunterId, FullAndPartialSSN] = Map.empty
  var punterSettings: Map[PunterId, PunterSettings] = Map.empty
  case class RegistrationConfirmation(outcome: RegistrationOutcome, registeredAt: OffsetDateTime)
  var registrationConfirmations: Map[PunterId, RegistrationConfirmation] = Map.empty

  override def startPunterRegistration(
      punter: Punter,
      startedAt: OffsetDateTime): EitherT[Future, RecordPunterError, Unit] = {
    log.info(s"startPunterRegistration: ${punter.punterId} ${punter.ssn}")
    EitherT.fromEither {
      if (punterExistsById(punter.punterId))
        Left(PunterIdAlreadyExists)
      else if (punterExistsByUsername(punter.details.userName))
        Left(PunterUsernameAlreadyExists)
      else if (punterExistsByEmail(punter.details.email))
        Left(PunterEmailAlreadyExists)
      else if (punter.ssn.exists(ssnAlreadyExists))
        Left(SSNAlreadyExists)
      else
        Right {
          upsertPunterDetails(punter.punterId, punter.details)
          upsertSSN(punter.punterId, punter.ssn)
          upsertPunterSettings(punter.punterId, punter.settings)
        }
    }
  }

  override def markRegistrationFinished(
      punterId: PunterId,
      outcome: RegistrationOutcome,
      finishedAt: OffsetDateTime): EitherT[Future, PuntersRepositoryErrors.PunterIdNotFound.type, Unit] =
    EitherT.fromEither {
      if (punterExistsById(punterId))
        Right {
          registrationConfirmations =
            registrationConfirmations + (punterId -> RegistrationConfirmation(outcome, finishedAt))
        }
      else
        Left(PunterIdNotFound)
    }

  override def getRegisteredAt(punterId: PunterId): Future[Option[OffsetDateTime]] = {
    Future.successful(registrationConfirmations.find(_._1 == punterId).map(_._2.registeredAt))
  }

  override def register(punter: Punter, finishedAt: OffsetDateTime): EitherT[Future, RecordPunterError, Unit] =
    startPunterRegistration(punter, finishedAt).semiflatMap { _ =>
      markRegistrationFinished(punter.punterId, RegistrationOutcome.Successful, finishedAt)
        .getOrElseF(Future.failed(new IllegalStateException("Missing punter data, this should never happen")))
    }

  override def setSSN(punterId: PunterId, ssn: FullSSN): EitherT[Future, SetSSNError, Unit] =
    EitherT.fromEither {
      if (ssnAlreadyExists(ssn))
        Left(SSNAlreadyExists)
      else if (!punterExistsById(punterId))
        Left(PunterIdNotFound)
      else
        Right(upsertSSN(punterId, Right(ssn)))
    }

  override def updateDetails(
      punterId: PunterId,
      update: PunterPersonalDetails => PunterPersonalDetails): EitherT[Future, ChangePunterDetailsError, Unit] =
    findByPunterId(punterId).toRight(PunterIdNotFound).subflatMap { punter =>
      val updatedDetails = update(punter.details)
      val otherPunters = punterDetails - punterId

      if (punterExistsByUsername(updatedDetails.userName, otherPunters))
        Left(PunterUsernameAlreadyExists)
      else if (punterExistsByEmail(updatedDetails.email, otherPunters))
        Left(PunterEmailAlreadyExists)
      else
        Right { punterDetails = punterDetails + (punterId -> updatedDetails) }
    }

  override def updateSettings(punterId: PunterId, update: PunterSettings => PunterSettings)
      : EitherT[Future, PuntersRepositoryErrors.ChangePunterSettingsError, Unit] =
    findByPunterId(punterId)
      .toRight(PunterIdNotFoundInSettings)
      .map { punter =>
        val updatedSettings = update(punter.settings)
        punterSettings = punterSettings + (punterId -> updatedSettings)
      }
      .leftWiden[PuntersRepositoryErrors.ChangePunterSettingsError]

  override def delete(punterId: PunterId): Future[Unit] =
    Future {
      punterDetails = punterDetails - punterId
      punterSsns = punterSsns - punterId
      registrationConfirmations = registrationConfirmations - punterId
    }

  override def deleteSSN(punterId: PunterId): Future[Int] =
    Future {
      val prevCount = punterSsns.size
      punterSsns = punterSsns - punterId
      prevCount - punterSsns.size
    }

  override def countPuntersWithStartedRegistration(): Future[Int] =
    Future.successful(punterDetails.size)

  override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] = {
    for {
      details <- OptionT.fromOption[Future](punterDetails.get(punterId))
      ssns <- {
        OptionT.fromOption[Future](punterSsns.get(punterId))
      }.orElse {
        OptionT(additionalSSNLookup(punterId)).map(FullAndPartialSSN(None, _))
      }
      settings <- OptionT.fromOption[Future](punterSettings.get(punterId))
    } yield Punter(punterId, details, ssns.fullSSn.toRight(ssns.last4DigitsOfSSN), settings)
  }

  override def findExcludedPunters(search: SelfExcludedPunterSearch): OptionT[Future, (Punter, SearchConfidence)] = {
    val allPunters = confirmedRegistrations()
    val exactSearch = allPunters
      .filter(
        punter =>
          fullSSNMatch(punter, search) ||
          (partialSSNMatch(punter, search) && dateOfBirthMatch(punter, search)) ||
          (noSSN(search) && lastNameExactMatch(punter, search) && dateOfBirthMatch(punter, search)))
      .map(_ -> SearchConfidence.ExactMatch)
    val closeMatch = allPunters
      .filter(punter => noSSN(search) && lastNameCloseMatch(punter, search) && dateOfBirthMatch(punter, search))
      .map(_ -> SearchConfidence.CloseMatch)

    OptionT.fromOption((exactSearch ++ closeMatch).headOption)
  }

  override def findPuntersByFilters(search: PunterSearch, pagination: Pagination): Future[PaginatedResult[Punter]] =
    Future.successful {
      val filteredPunters = punterDetails
        .filter { case (punterId, _) => search.punterId.forall(_ == punterId) }
        .filter {
          case (_, details) =>
            search.firstName.forall(_.value.toLowerCase() == details.name.firstName.value.toLowerCase)
        }
        .filter {
          case (_, details) =>
            search.lastName.forall(_.value.toLowerCase() == details.name.lastName.value.toLowerCase())
        }
        .filter {
          case (_, details) =>
            search.dateOfBirth.forall(_ == details.dateOfBirth)
        }
        .filter {
          case (_, details) =>
            search.email.forall(_ == details.email)
        }
        .filter {
          case (_, details) =>
            search.username.forall(_ == details.userName)
        }
        .map {
          case (punterId, details) =>
            Punter(punterId, details, punterSsns(punterId).toFullOrPartialSSN(), punterSettings(punterId))
        }
        .toList

      PaginatedResult(
        data = filteredPunters.sortBy(_.punterId.toString).drop(pagination.offset).take(pagination.itemsPerPage),
        totalCount = filteredPunters.size,
        paginationRequest = pagination)
    }

  override def getConfirmedPunters(): Source[Punter, NotUsed] =
    Source(confirmedRegistrations().toList)

  private def confirmedRegistrations(): Iterable[Punter] =
    punterDetails.filter { case (punterId, _) => registrationConfirmations.contains(punterId) }.map {
      case (punterId, details) =>
        val ssns = punterSsns(punterId)
        val settings = punterSettings(punterId)
        log.info(s"SSNs: $punterId $ssns")
        Punter(punterId, details, ssn = ssns.toFullOrPartialSSN(), settings)
    }

  private def ssnAlreadyExists(ssn: FullSSN): Boolean =
    punterSsns.collectFirst { case (_, FullAndPartialSSN(Some(recordedSSN), _)) if recordedSSN == ssn => ssn }.isDefined

  private def upsertPunterDetails(punterId: PunterId, details: PunterPersonalDetails): Unit = {
    val detailsWithEmailLowercased = details.focus(_.email.value).modify(_.toLowerCase)
    punterDetails = punterDetails + (punterId -> detailsWithEmailLowercased)
  }
  private def upsertPunterSettings(punterId: PunterId, settings: PunterSettings): Unit = {
    punterSettings = punterSettings + (punterId -> settings)
  }

  private def upsertSSN(punterId: PunterId, ssn: FullOrPartialSSN): Unit = {
    log.info(s"upsertSSN: ${punterId.value} $ssn")
    punterSsns = punterSsns + (punterId -> FullAndPartialSSN(ssn.toOption, ssn.toLast4Digits))
  }

  private def punterExistsById(
      id: PunterId,
      lookup: Map[PunterId, PunterPersonalDetails] = this.punterDetails): Boolean =
    lookup.contains(id)

  private def punterExistsByUsername(
      userName: Username,
      lookup: Map[PunterId, PunterPersonalDetails] = this.punterDetails): Boolean =
    lookup.exists { case (_, d) => d.userName == userName }

  private def punterExistsByEmail(
      email: Email,
      lookup: Map[PunterId, PunterPersonalDetails] = this.punterDetails): Boolean =
    lookup.exists { case (_, d) => d.email == email }

  private def fullSSNMatch(punter: Punter, search: SelfExcludedPunterSearch): Boolean =
    (for {
      punterSSN <- punter.ssn.toOption
      lookupSSN <- search.ssn.flatMap(_.toOption)
    } yield punterSSN == lookupSSN).getOrElse(false)

  private def partialSSNMatch(punter: Punter, search: SelfExcludedPunterSearch): Boolean = {
    val punterSSN = punter.ssn.toLast4Digits
    search.ssn.map(_.toLast4Digits).invariantContains(punterSSN)
  }

  private def dateOfBirthMatch(punter: Punter, search: SelfExcludedPunterSearch): Boolean =
    punter.details.dateOfBirth == search.dateOfBirth

  private def noSSN(search: SelfExcludedPunterSearch): Boolean =
    search.ssn.isEmpty

  private def lastNameExactMatch(punter: Punter, search: SelfExcludedPunterSearch): Boolean =
    NormalizedLastName(punter.details.name.lastName.value) == search.name

  private def lastNameCloseMatch(punter: Punter, search: SelfExcludedPunterSearch): Boolean = {
    val d = distance.apply(NormalizedLastName(punter.details.name.lastName.value).value, search.name.value)
    0 <= d && d <= MAX_LEVENSHTEIN_DISTANCE
  }
}

object InMemoryPuntersRepository extends FutureSupport {
  def withRegisteredPunters(finishedAt: OffsetDateTime, punters: Punter*)(implicit
      ec: ExecutionContext): InMemoryPuntersRepository = {
    val repository = new InMemoryPuntersRepository()
    punters.foreach(punter => awaitRight(repository.register(punter, finishedAt)))
    repository
  }
}
