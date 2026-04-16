package phoenix.http.routes

import java.time.OffsetDateTime

import enumeratum.Enum
import enumeratum.EnumEntry
import sttp.model.HeaderNames
import sttp.tapir._
import sttp.tapir.codec.enumeratum.plainCodecEnumEntry

import phoenix.core.Clock
import phoenix.core.ordering.Direction
import phoenix.core.pagination.Pagination
import phoenix.http.core.IpAddress
import phoenix.markets.fixtures.FixtureQuery
import phoenix.markets.fixtures.FixtureStatus
import phoenix.markets.infrastructure.http.MarketTapirCodecs._
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.FirstName
import phoenix.punters.domain.LastName
import phoenix.punters.domain.PunterSearch
import phoenix.punters.domain.Username
import phoenix.punters.infrastructure.http.PunterTapirCodecs._

object EndpointInputs {

  object pagination {
    val currentPage: String = "pagination.currentPage"
    val itemsPerPage: String = "pagination.itemsPerPage"

    private val currentPageQuery = query[Option[Int]](currentPage)
    private val itemsPerPageQuery = query[Option[Int]](itemsPerPage)

    private val inputMapping =
      Mapping.from[(Option[Int], Option[Int]), Pagination] {
        case (maybeCurrentPage, maybeItemsPerPage) =>
          Pagination(maybeCurrentPage.getOrElse(1), maybeItemsPerPage.getOrElse(20))
      }(p => (Some(p.currentPage), Some(p.itemsPerPage)))

    val queryParams: EndpointInput[Pagination] =
      (pagination.currentPageQuery and pagination.itemsPerPageQuery).map(inputMapping)
  }

  final case class TimeRange(start: OffsetDateTime, end: OffsetDateTime)

  object TimeRange {
    def lastDays(count: Int)(implicit clock: Clock): TimeRange = {
      val now = clock.currentOffsetDateTime()
      val countDaysBefore = now.minusDays(count)
      TimeRange(countDaysBefore, now)
    }
  }

  object timeRangeFilter {
    val sinceFilter: String = "filters.since"
    val untilFilter: String = "filters.until"

    private val sinceQuery = query[Option[OffsetDateTime]](sinceFilter)
    private val untilQuery = query[Option[OffsetDateTime]](untilFilter)

    def extractTimeRangeFilter(sinceOption: Option[OffsetDateTime], untilOption: Option[OffsetDateTime])(implicit
        clock: Clock): TimeRange = {
      TimeRange(
        start = sinceOption.getOrElse(OffsetDateTime.MIN),
        end = untilOption.getOrElse(clock.currentOffsetDateTime()))
    }

    private def inputMapping(implicit clock: Clock) = {
      Mapping.from[(Option[OffsetDateTime], Option[OffsetDateTime]), TimeRange] {
        case (sinceOption, untilOption) => extractTimeRangeFilter(sinceOption, untilOption)
      } { timeRange =>
        (Some(timeRange.start), Some(timeRange.end))
      }
    }

    def queryParams(implicit clock: Clock): EndpointInput[TimeRange] =
      (sinceQuery and untilQuery)
        .map(inputMapping)
        .validate(Validator.Custom(timeRange => {
          if (timeRange.start.isBefore(timeRange.end)) {
            List.empty
          } else {
            List(ValidationError.Custom(timeRange, "Start should be before end"))
          }
        }))
  }

  object fixtureFilter {
    val sportId: String = "filter.sportId"
    val tournamentId: String = "filter.tournamentId"
    val fixtureStatus: String = "filter.fixtureStatus"

    private val sportIdQuery = query[Option[SportId]](sportId)
    private val tournamentIdQuery = query[Option[TournamentId]](tournamentId)
    private val fixtureStatusQuery =
      enumQueryWithGivenValuesAsDefault[FixtureStatus](fixtureStatus, FixtureStatus.UnfinishedStatuses)

    private val inputMapping =
      Mapping.from[(Option[SportId], Option[TournamentId], Set[FixtureStatus]), FixtureQuery](FixtureQuery.tupled)(
        FixtureQuery.unapply(_).get)

    val queryParams: EndpointInput[FixtureQuery] =
      (fixtureFilter.sportIdQuery and fixtureFilter.tournamentIdQuery and fixtureFilter.fixtureStatusQuery)
        .map(inputMapping)
  }

  object fixtureOrdering {
    private val byStartTime: String = "ordering.startTime"

    val queryParam: EndpointInput[Option[Direction]] = query[Option[Direction]](byStartTime)
  }

  object punterFilter {
    val punterId: String = "filter.punterId"
    val firstName: String = "filter.firstName"
    val lastName: String = "filter.lastName"
    val dateOfBirth: String = "filter.dateOfBirth"
    val username: String = "filter.username"

    private val punterIdQuery: EndpointInput.Query[Option[PunterId]] = query[Option[PunterId]](punterId)
    private val firstNameQuery: EndpointInput.Query[Option[FirstName]] = query[Option[FirstName]](firstName)
    private val lastNameQuery: EndpointInput.Query[Option[LastName]] = query[Option[LastName]](lastName)
    private val dateOfBirthQuery: EndpointInput.Query[Option[DateOfBirth]] = query[Option[DateOfBirth]](dateOfBirth)
    private val usernameQuery: EndpointInput.Query[Option[Username]] = query[Option[Username]](username)

    private val inputMapping: Mapping[
      (Option[PunterId], Option[FirstName], Option[LastName], Option[DateOfBirth], Option[Username]),
      PunterSearch] =
      Mapping.from[
        (Option[PunterId], Option[FirstName], Option[LastName], Option[DateOfBirth], Option[Username]),
        PunterSearch] {
        case (id, name, lname, dob, username) =>
          PunterSearch(punterId = id, firstName = name, lastName = lname, dateOfBirth = dob, username = username)
      }(search => (search.punterId, search.firstName, search.lastName, search.dateOfBirth, search.username))

    val queryParams: EndpointInput[PunterSearch] =
      (punterIdQuery and firstNameQuery and lastNameQuery and dateOfBirthQuery and usernameQuery).map(inputMapping)
  }

  object baseUrl {
    final case class PhoenixAppBaseUrl(value: String)
    final case class PhoenixAppBaseUrlInput(value: PhoenixAppBaseUrl, setFrom: SetFrom)
    sealed trait SetFrom
    object SetFrom {
      case object DevDomainHeader extends SetFrom
      case object OriginHeader extends SetFrom
      case object DefaultValue extends SetFrom
    }

    private val phoenixAppBaseUrlMapping =
      Mapping.from[(Option[String], Option[String]), PhoenixAppBaseUrlInput] {
        case (maybeXDevDomain: Option[String], maybeOrigin: Option[String]) =>
          val fromXDevDomain =
            maybeXDevDomain.map(xDevDomain =>
              PhoenixAppBaseUrlInput(PhoenixAppBaseUrl(xDevDomain), SetFrom.DevDomainHeader))
          val fromOrigin =
            maybeOrigin.map(origin => PhoenixAppBaseUrlInput(PhoenixAppBaseUrl(origin), SetFrom.OriginHeader))
          val localhost = PhoenixAppBaseUrlInput(PhoenixAppBaseUrl("http://localhost"), SetFrom.DefaultValue)

          fromXDevDomain.orElse(fromOrigin).getOrElse(localhost)
      }(phoenixAppBaseUrlInput =>
        phoenixAppBaseUrlInput.setFrom match {
          case SetFrom.DevDomainHeader => (Some(phoenixAppBaseUrlInput.value.value), None)
          case SetFrom.OriginHeader    => (None, Some(phoenixAppBaseUrlInput.value.value))
          case SetFrom.DefaultValue    => (None, None)
        })

    val phoenixAppBaseUrlInput: EndpointInput[PhoenixAppBaseUrlInput] =
      header[Option[String]]("X-Dev-Domain")
        .and(header[Option[String]](HeaderNames.Origin))
        .map(phoenixAppBaseUrlMapping)
  }

  private class EnumCodec[E <: EnumEntry](anEnum: Enum[E], defaultValues: Set[E])
      extends Codec[List[String], Set[E], CodecFormat.TextPlain] {
    private val codec = Codec.set(plainCodecEnumEntry(anEnum))

    override def schema: Schema[Set[E]] = codec.schema

    override def format: CodecFormat.TextPlain = codec.format

    override def rawDecode(l: List[String]): DecodeResult[Set[E]] =
      codec.rawDecode(l).map { set =>
        if (set.nonEmpty) set else defaultValues
      }

    override def encode(h: Set[E]): List[String] = codec.encode(h)

  }

  def enumQueryWithGivenValuesAsDefault[E <: EnumEntry](name: String, defaultValues: Set[E])(implicit
      anEnum: Enum[E]): EndpointInput[Set[E]] = {
    EndpointInput.Query(name, codec = new EnumCodec(anEnum, defaultValues), info = EndpointIO.Info.empty)
  }

  def enumQueryWithAllValuesAsDefault[E <: EnumEntry](name: String)(implicit anEnum: Enum[E]): EndpointInput[Set[E]] = {
    enumQueryWithGivenValuesAsDefault(name, defaultValues = anEnum.values.toSet)
  }

  val optionalIpAddress: EndpointInput[Option[IpAddress]] =
    clientIp.map(_.map(IpAddress.apply))(_.map(_.value))

}
