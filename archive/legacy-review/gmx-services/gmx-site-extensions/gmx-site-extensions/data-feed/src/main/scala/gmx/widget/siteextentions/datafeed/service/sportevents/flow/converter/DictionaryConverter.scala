package gmx.widget.siteextentions.datafeed.service.sportevents.flow.converter

import tech.argyll.video.domain.model.MarketType
import tech.argyll.video.domain.model.SelectionType
import tech.argyll.video.domain.model.SportType

import gmx.common.internal.partner.sbtech.cons.SBTechMarketType
import gmx.common.internal.partner.sbtech.cons.SBTechSelectionType
import gmx.common.internal.partner.sbtech.cons.SBTechSportType
import gmx.dataapi.internal.siteextensions.event.EventStatusEnum
import gmx.dataapi.internal.siteextensions.event.EventTypeEnum
import gmx.dataapi.internal.siteextensions.event.ParticipantRunnerStatusEnum
import gmx.dataapi.internal.siteextensions.event.ParticipantVenueRoleEnum
import gmx.dataapi.internal.siteextensions.selection.SelectionOddsTypeEnum
import gmx.dataapi.internal.siteextensions.selection.SelectionRunnerStatusEnum

object DictionaryConverter {

  def mapSportType(sportId: CharSequence): SportType = {
    SBTechSportType
      .findById(sportId.toString)
      .map(_.sportType)
      .getOrElse(throwConverterException(s"SportType not found for $sportId"))
  }

  def mapEventType(eventType: CharSequence): EventTypeEnum = {
    EventTypeEnumMapping
      .findByName(eventType.toString)
      .getOrElse(throwConverterException(s"EventType not found for $eventType"))
  }

  def mapEventStatus(status: CharSequence): EventStatusEnum = {
    EventStatusEnumMapping
      .findByName(status.toString)
      .getOrElse(throwConverterException(s"EventStatus not found for $status"))
  }

  def mapParticipantVenueRole(venueRole: CharSequence): ParticipantVenueRoleEnum = {
    ParticipantVenueRoleEnumMapping
      .findByName(venueRole.toString)
      .getOrElse(throwConverterException(s"ParticipantVenueRole not found for $venueRole"))
  }

  def mapParticipantRunnerStatus(runnerStatus: CharSequence): ParticipantRunnerStatusEnum = {
    ParticipantRunnerStatusEnumMapping
      .findByStatusValue(runnerStatus.toString)
      .getOrElse(throwConverterException(s"ParticipantRunnerStatus not found for $runnerStatus"))
  }

  def mapMarketType(marketTypeId: CharSequence): MarketType = {
    SBTechMarketType
      .findById(marketTypeId.toString)
      .map(_.marketType)
      .getOrElse(throwConverterException(s"MarketType not found for $marketTypeId"))
  }

  def mapSelectionType(selectionId: CharSequence): SelectionType = {
    SBTechSelectionType
      .findById(selectionId.toString)
      .map(_.selectionType)
      .getOrElse(throwConverterException(s"SelectionType not found for $selectionId"))
  }

  def mapSelectionOddsTypeEnum(oddsType: CharSequence): SelectionOddsTypeEnum = {
    SelectionOddsTypeEnumMapping
      .findByName(oddsType.toString)
      .getOrElse(throwConverterException(s"SelectionOddsType not found for $oddsType"))
  }

  def mapSelectionRunnerStatus(runnerStatus: CharSequence): SelectionRunnerStatusEnum = {
    SelectionRunnerStatusEnumMapping
      .findByStatusValue(runnerStatus.toString)
      .getOrElse(throwConverterException(s"SelectionRunnerStatus not found for $runnerStatus"))
  }

  trait EnumMapping[T <: Enum[_]] {
    lazy val unknowableFiltered: Seq[T] = values.filterNot(_.equals(unknowable))

    lazy val supported: Map[String, T] =
      unknowableFiltered.map(e => (e.name().toLowerCase, e)).toMap

    def unknowable: T

    def values: Seq[T]

    def findByName(in: String): Option[T] = supported.get(in.toLowerCase)
  }

  object EventTypeEnumMapping extends EnumMapping[EventTypeEnum] {
    override def unknowable: EventTypeEnum = EventTypeEnum.UNKNOWABLE
    override def values: Seq[EventTypeEnum] = EventTypeEnum.values().toSeq
  }

  object EventStatusEnumMapping extends EnumMapping[EventStatusEnum] {
    override def unknowable: EventStatusEnum = EventStatusEnum.UNKNOWABLE
    override def values: Seq[EventStatusEnum] = EventStatusEnum.values().toSeq
  }

  object ParticipantVenueRoleEnumMapping extends EnumMapping[ParticipantVenueRoleEnum] {
    override def unknowable: ParticipantVenueRoleEnum = ParticipantVenueRoleEnum.UNKNOWABLE
    override def values: Seq[ParticipantVenueRoleEnum] = ParticipantVenueRoleEnum.values().toSeq
  }

  object ParticipantRunnerStatusEnumMapping extends EnumMapping[ParticipantRunnerStatusEnum] {
    lazy val supportedStatusValues: Map[String, ParticipantRunnerStatusEnum] =
      unknowableFiltered.map(statusEnum => (statusEnum.statusValue.toLowerCase, statusEnum)).toMap

    def findByStatusValue(statusValue: String): Option[ParticipantRunnerStatusEnum] =
      supportedStatusValues.get(statusValue.toLowerCase)

    override def unknowable: ParticipantRunnerStatusEnum = ParticipantRunnerStatusEnum.UNKNOWABLE
    override def values: Seq[ParticipantRunnerStatusEnum] = ParticipantRunnerStatusEnum.values().toSeq
  }

  object SelectionOddsTypeEnumMapping extends EnumMapping[SelectionOddsTypeEnum] {
    override def unknowable: SelectionOddsTypeEnum = SelectionOddsTypeEnum.UNKNOWABLE
    override def values: Seq[SelectionOddsTypeEnum] = SelectionOddsTypeEnum.values().toSeq
  }

  object SelectionRunnerStatusEnumMapping extends EnumMapping[SelectionRunnerStatusEnum] {
    lazy val supportedStatusValues: Map[String, SelectionRunnerStatusEnum] =
      unknowableFiltered.map(statusEnum => (statusEnum.statusValue.toLowerCase, statusEnum)).toMap

    def findByStatusValue(statusValue: String): Option[SelectionRunnerStatusEnum] =
      supportedStatusValues.get(statusValue.toLowerCase)

    override def unknowable: SelectionRunnerStatusEnum = SelectionRunnerStatusEnum.UNKNOWABLE
    override def values: Seq[SelectionRunnerStatusEnum] = SelectionRunnerStatusEnum.values().toSeq
  }
}
