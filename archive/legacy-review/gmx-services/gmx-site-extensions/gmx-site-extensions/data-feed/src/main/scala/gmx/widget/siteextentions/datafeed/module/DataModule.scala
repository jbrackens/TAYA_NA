package gmx.widget.siteextentions.datafeed.module

import scala.concurrent.Future

import akka.Done
import akka.actor.typed.ActorSystem
import akka.kafka.scaladsl.Consumer.Control
import com.softwaremill.macwire.Module
import com.softwaremill.macwire.wire
import com.typesafe.config.Config
import com.typesafe.scalalogging.LazyLogging
import pureconfig.generic.auto._
import tech.argyll.video.domain.model.PartnerType

import gmx.widget.siteextentions.datafeed.OperatorTypeConfig
import gmx.widget.siteextentions.datafeed.service.MessageRetriesScheduler
import gmx.widget.siteextentions.datafeed.service.persistence.StoreUpdateMessageService
import gmx.widget.siteextentions.datafeed.service.sportevents.MessageToRetryPersistenceConfig
import gmx.widget.siteextentions.datafeed.service.sportevents.SportEventFeed
import gmx.widget.siteextentions.datafeed.service.sportevents.SportEventsConfig
import gmx.widget.siteextentions.datafeed.service.sportevents.flow.SportEventFlow
import gmx.widget.siteextentions.datafeed.service.sportevents.sink.DBEventSink
import gmx.widget.siteextentions.datafeed.service.sportevents.sink.EventSink
import gmx.widget.siteextentions.datafeed.service.sportevents.source.KafkaEventSource

@Module
class DataModule(persistenceModule: PersistenceModule)(implicit config: Config, system: ActorSystem[_])
    extends LazyLogging {

  implicit val sportEventsConfig: SportEventsConfig = SportEventsConfig(config)
  val sportEventsPersistenceConfig: MessageToRetryPersistenceConfig = sportEventsConfig.persistence
  val partnerType: PartnerType = OperatorTypeConfig.getOperatorType(config).getPartnerType

  if (sportEventsConfig.kafkaSource.enabled) {
    val source: KafkaEventSource = wire[KafkaEventSource]
    val flow: SportEventFlow = wire[SportEventFlow]
    val storeUpdateMessageService: StoreUpdateMessageService = wire[StoreUpdateMessageService]
    val sink: EventSink[Future[Done]] = wire[DBEventSink]
    val sportEventFeed: SportEventFeed[Control, Future[Done]] = wire[SportEventFeed[Control, Future[Done]]]
    sportEventFeed.runTopology()
    val messageRetriesScheduler = new MessageRetriesScheduler(
      storeUpdateMessageService,
      persistenceModule.messageToRetryService,
      persistenceModule.messageLogService,
      source,
      sportEventsPersistenceConfig.deleteMessagesRetriedEarlierThan)
    if (sportEventsPersistenceConfig.startRetryJob) {
      messageRetriesScheduler.scheduleMessageRetries(sportEventsPersistenceConfig.retryJobFrequencySeconds)
    }
    //TODO (GM-1802): remove when flink fix
//    if (sportEventsPersistenceConfig.startCleanupJob) {
//      val timeZone = TimeZone.getTimeZone(sportEventsPersistenceConfig.cleanupJobTimeZone)
//      messageRetriesScheduler.scheduleCleanupJob(sportEventsPersistenceConfig.cleanupJobCronTrigger, timeZone)
//    }
  } else {
    logger.info("Kafka for sportEvents DISABLED")
  }
}
