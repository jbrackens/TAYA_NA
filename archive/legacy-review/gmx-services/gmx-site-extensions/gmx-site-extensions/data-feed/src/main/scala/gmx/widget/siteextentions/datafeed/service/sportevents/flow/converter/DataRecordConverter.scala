package gmx.widget.siteextentions.datafeed.service.sportevents.flow.converter

import tech.argyll.video.domain.model.PartnerType

import gmx.dataapi.internal.siteextensions.SportEventUpdate
import gmx.dataapi.internal.siteextensions.SportEventUpdateType
import gmx.dataapi.internal.siteextensions.event.Event
import gmx.dataapi.internal.siteextensions.market.Market
import gmx.dataapi.internal.siteextensions.selection.Selection
import gmx.widget.siteextentions.datafeed.service.Elements.DeleteHeader
import gmx.widget.siteextentions.datafeed.service.Elements.StateUpdate
import gmx.widget.siteextentions.datafeed.service.Elements.UpdateHeader
import gmx.widget.siteextentions.datafeed.service.sportevents.source.DataDelete
import gmx.widget.siteextentions.datafeed.service.sportevents.source.DataRecord
import gmx.widget.siteextentions.datafeed.service.sportevents.source.DataUpdate

object DataRecordConverter {
  def convert(item: DataRecord, partnerType: PartnerType): StateUpdate =
    item match {
      case DataUpdate(_, value) =>
        val header = mapUpdateHeader(value, partnerType)
        value.getPayload match {
          case e: Event     => EventConverter.mapUpdate(e, header)
          case m: Market    => MarketConverter.mapUpdate(m, header)
          case s: Selection => SelectionConverter.mapUpdate(s, header)
        }
      case DataDelete(key) =>
        val header = mapDeleteHeader(partnerType)
        key.getType match {
          case SportEventUpdateType.Event     => EventConverter.mapDelete(key, header)
          case SportEventUpdateType.Market    => MarketConverter.mapDelete(key, header)
          case SportEventUpdateType.Selection => SelectionConverter.mapDelete(key, header)
        }
    }

  private def mapUpdateHeader(value: SportEventUpdate, partnerType: PartnerType): UpdateHeader =
    UpdateHeader(
      partner = partnerType,
      messageId = value.getMessageId.toString,
      originDate = normalizeTimestamp(value.getMessageOriginDateUTC),
      processingDate = normalizeTimestamp(value.getMessageProcessingDateUTC))

  private def mapDeleteHeader(partnerType: PartnerType): DeleteHeader =
    DeleteHeader(partner = partnerType)
}
