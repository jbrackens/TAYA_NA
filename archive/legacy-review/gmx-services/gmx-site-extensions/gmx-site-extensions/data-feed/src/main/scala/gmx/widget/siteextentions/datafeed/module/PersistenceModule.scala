package gmx.widget.siteextentions.datafeed.module

import com.softwaremill.macwire.Module
import com.softwaremill.macwire.wire
import com.typesafe.config.Config
import com.typesafe.scalalogging.LazyLogging
import pureconfig.generic.auto._
import tech.argyll.video.core.sbtech.SBTechTypeFinder
import tech.argyll.video.core.sbtech.page.NameNormalizer
import tech.argyll.video.core.sbtech.page.URLBuilder
import tech.argyll.video.domain.EventDao
import tech.argyll.video.domain.MarketDao
import tech.argyll.video.domain.SelectionDao
import tech.argyll.video.domain.model.PartnerType

import gmx.widget.siteextentions.datafeed.OperatorTypeConfig
import gmx.widget.siteextentions.datafeed.service.persistence.EventUpdateProcessor
import gmx.widget.siteextentions.datafeed.service.persistence.MarketUpdateProcessor
import gmx.widget.siteextentions.datafeed.service.persistence.MessageLogDao
import gmx.widget.siteextentions.datafeed.service.persistence.MessageLogService
import gmx.widget.siteextentions.datafeed.service.persistence.MessageToRetryDao
import gmx.widget.siteextentions.datafeed.service.persistence.MessageToRetryService
import gmx.widget.siteextentions.datafeed.service.persistence.SelectionUpdateProcessor
import gmx.widget.siteextentions.datafeed.service.persistence.StateUpdateProcessor
import gmx.widget.siteextentions.datafeed.service.persistence.details._
import gmx.widget.siteextentions.datafeed.service.persistence.patching.EventModelPatcher
import gmx.widget.siteextentions.datafeed.service.persistence.patching.MarketModelPatcher
import gmx.widget.siteextentions.datafeed.service.persistence.patching.SelectionModelPatcher
import gmx.widget.siteextentions.datafeed.service.sportevents.MessageToRetryPersistenceConfig
import gmx.widget.siteextentions.datafeed.service.sportevents.SportEventsConfig

@Module
class PersistenceModule(
    messageToRetryPersistenceConfig: MessageToRetryPersistenceConfig,
    partnerType: PartnerType = PartnerType.SPORT_NATION)
    extends LazyLogging {

  lazy val urlBuilder = new URLBuilder(new NameNormalizer, new SBTechTypeFinder)

  lazy val eventDao: EventDao = wire[EventDao]
  lazy val marketDao: MarketDao = wire[MarketDao]
  lazy val selectionDao: SelectionDao = wire[SelectionDao]
  lazy val messageToRetryDao: MessageToRetryDao = wire[MessageToRetryDao]
  lazy val messageLogDao: MessageLogDao = wire[MessageLogDao]

  lazy val enhancedOddsDetailsConverter: EnhancedOddsDetailsConverter = wire[EnhancedOddsDetailsConverter]
  lazy val footballDetailsConverter: FootballDetailsConverter = wire[FootballDetailsConverter]
  lazy val horseRacingDetailsConverter: HorseRacingDetailsConverter = wire[HorseRacingDetailsConverter]
  lazy val soccerDetailsConverter: SoccerDetailsConverter = wire[SoccerDetailsConverter]
  lazy val detailsConverter: DetailsConverter = wire[DetailsConverter]

  lazy val eventModelPatcher: EventModelPatcher = wire[EventModelPatcher]
  lazy val marketModelPatcher: MarketModelPatcher = wire[MarketModelPatcher]
  lazy val selectionModelPatcher: SelectionModelPatcher = wire[SelectionModelPatcher]

  lazy val eventUpdateProcessor: EventUpdateProcessor = wire[EventUpdateProcessor]
  lazy val marketUpdateProcessor: MarketUpdateProcessor = wire[MarketUpdateProcessor]
  lazy val selectionUpdateProcessor: SelectionUpdateProcessor = wire[SelectionUpdateProcessor]
  lazy val stateUpdateProcessor: StateUpdateProcessor = wire[StateUpdateProcessor]

  lazy val messageToRetryService: MessageToRetryService = wire[MessageToRetryService]
  lazy val messageLogService: MessageLogService = wire[MessageLogService]
}

object PersistenceModule {
  // TODO it uses the same config as in data; later on rethink this and improve
  def apply(config: Config): PersistenceModule =
    new PersistenceModule(
      SportEventsConfig(config).persistence,
      OperatorTypeConfig.getOperatorType(config).getPartnerType)
}
