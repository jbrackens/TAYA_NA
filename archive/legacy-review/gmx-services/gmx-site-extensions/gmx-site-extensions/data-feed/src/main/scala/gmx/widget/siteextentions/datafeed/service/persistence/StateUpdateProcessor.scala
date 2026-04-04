package gmx.widget.siteextentions.datafeed.service.persistence

import com.typesafe.scalalogging.LazyLogging

import gmx.widget.siteextentions.datafeed.service.Elements._

class StateUpdateProcessor(
    eventUpdateProcessor: EventUpdateProcessor,
    marketUpdateProcessor: MarketUpdateProcessor,
    selectionUpdateProcessor: SelectionUpdateProcessor)
    extends LazyLogging {

  def persist(item: StateUpdate): String =
    item match {
      case eventUpdate: EventUpdate =>
        eventUpdateProcessor.process(eventUpdate).getId

      case eventDelete: EventDelete =>
        eventUpdateProcessor.process(eventDelete).getId

      case marketUpdate: MarketUpdate =>
        marketUpdateProcessor.process(marketUpdate).getId

      case marketDelete: MarketDelete =>
        marketUpdateProcessor.process(marketDelete).getId

      case selectionUpdate: SelectionUpdate =>
        selectionUpdateProcessor.process(selectionUpdate).getId

      case selectionDelete: SelectionDelete =>
        selectionUpdateProcessor.process(selectionDelete).getId
    }
}
