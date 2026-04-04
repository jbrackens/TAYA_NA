package gmx.widget.siteextentions.datafeed.e2e

import scala.concurrent.Future

import akka.Done
import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.kafka.scaladsl.Consumer.Control
import akka.stream.scaladsl.Sink
import com.dimafeng.testcontainers.Container
import com.dimafeng.testcontainers.ForAllTestContainer
import com.typesafe.config.ConfigFactory
import com.typesafe.config.ConfigValueFactory
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.KafkaIO
import net.flipsports.gmx.streaming.tests.kafka.SchemaRegistryOperations
import net.flipsports.gmx.streaming.tests.serializers.SerDes
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.scalamock.scalatest.MockFactory
import pureconfig.generic.auto._
import tech.argyll.video.domain.model.PartnerType

import gmx.dataapi.internal.siteextensions.SportEventUpdate
import gmx.dataapi.internal.siteextensions.SportEventUpdateKey
import gmx.dataapi.internal.siteextensions.SportEventUpdateType
import gmx.widget.siteextentions.datafeed.BaseSpec
import gmx.widget.siteextentions.datafeed.service.Elements
import gmx.widget.siteextentions.datafeed.service.persistence.MessageLogDao
import gmx.widget.siteextentions.datafeed.service.persistence.MessageLogService
import gmx.widget.siteextentions.datafeed.service.sportevents.SportEventFeed
import gmx.widget.siteextentions.datafeed.service.sportevents.SportEventsConfig
import gmx.widget.siteextentions.datafeed.service.sportevents.flow.SportEventFlow
import gmx.widget.siteextentions.datafeed.service.sportevents.sink.EventSink
import gmx.widget.siteextentions.datafeed.service.sportevents.source.EventSource
import gmx.widget.siteextentions.datafeed.service.sportevents.source.EventSource.AvroEventRecord
import gmx.widget.siteextentions.datafeed.service.sportevents.source.KafkaEventSource

class SportEventsKafkaSourceSpec
    extends ScalaTestWithActorTestKit
    with BaseSpec
    with ConfluentPlatformContainers
    with ForAllTestContainer
    with SchemaRegistryOperations
    with MockFactory {

  "A SportEventFeed in E2E tests" must {

    //TODO (GM-1705): revisit tests
    "read message from kafka and update DB" ignore {

      val sportUpdates = Seq((new SportEventUpdateKey(SportEventUpdateType.Event, "123"), null))

      withKafka(KafkaProperties()) { (kafkaProperties, schemaRegistryConnectionUrl) =>
        Given("")
        val config = ConfigFactory
          .load()
          .withValue(
            "akka.kafka.consumer.kafka-clients.bootstrap.servers",
            ConfigValueFactory.fromAnyRef(
              kafkaProperties.properties.getProperty(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG)))

        implicit val sportEventsConfig: SportEventsConfig = SportEventsConfig(config)
        sportEventsConfig.copy(kafkaSource =
          sportEventsConfig.kafkaSource.copy(schemaRegistry = schemaRegistryConnectionUrl))

        val source: EventSource[Control] = new KafkaEventSource
        val flow: SportEventFlow =
          new SportEventFlow(
            PartnerType.SPORT_NATION,
            mock[MessageLogService]
          ) // TODO - do not use mock, but it fails on build with java 8 and caffeine
        val sink: EventSink[Future[Done]] = new EventSink[Future[Done]] { //new DBEventSink(new )
          override def provide: Sink[(Elements.StateUpdate, AvroEventRecord), Future[Done]] = Sink.ignore
        }
        val sportEventFeed: SportEventFeed[Control, Future[Done]] = new SportEventFeed(source, flow, sink)
        sportEventFeed.runTopology()

        // source topic
        withSchemaKeyOnSubject(
          schemaRegistryConnectionUrl,
          sportEventsConfig.kafkaSource.topic,
          SportEventUpdateKey.SCHEMA$.toString)
        withSchemaValueOnSubject(
          schemaRegistryConnectionUrl,
          sportEventsConfig.kafkaSource.topic,
          SportEventUpdate.SCHEMA$.toString)

        KafkaIO(kafkaProperties, sportEventsConfig.kafkaSource.topic, schemaRegistryConnectionUrl).produceBinary(
          sportUpdates,
          SerDes.toAvro(key = true, schemaRegistryConnectionUrl),
          SerDes.toAvro(key = false, schemaRegistryConnectionUrl))
      }
    }
  }

  override def container: Container = kafkaWithSchemaRegistryContainers
}
