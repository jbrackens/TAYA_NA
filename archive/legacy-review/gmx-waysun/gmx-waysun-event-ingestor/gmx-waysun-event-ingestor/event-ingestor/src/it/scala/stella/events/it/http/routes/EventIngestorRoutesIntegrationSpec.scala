package stella.events.it.http.routes

import java.time.{Duration => JDuration}
import java.util
import java.util.Collections.singletonList
import java.util.UUID

import scala.jdk.CollectionConverters.IterableHasAsScala
import scala.jdk.CollectionConverters.IteratorHasAsScala

import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.headers.Authorization
import akka.http.scaladsl.model.headers.OAuth2BearerToken
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.testkit.ScalatestRouteTest
import org.apache.kafka.clients.consumer.ConsumerRecord
import org.apache.kafka.clients.consumer.KafkaConsumer
import org.redisson.config.Config
import org.scalatest.OptionValues
import org.scalatest.matchers.should
import org.scalatest.wordspec.AnyWordSpec
import org.scalatestplus.scalacheck.ScalaCheckDrivenPropertyChecks

import stella.common.core.Clock
import stella.common.http.jwt.DisabledJwtAuthorization
import stella.common.kafka.KafkaAvroConsumerProperties
import stella.common.kafka.config.KafkaProducerConsumerConfig
import stella.dataapi.platformevents.EventData
import stella.dataapi.platformevents.EventEnvelope
import stella.dataapi.platformevents.EventKey
import stella.dataapi.platformevents.Source

import stella.events.config.EventIngestorConfig
import stella.events.config.RedisPersistenceConfig
import stella.events.gen.Generators._
import stella.events.http.routes.EventIngestorRoutesModule
import stella.events.http.routes.json.IncomingAdminEvent
import stella.events.http.routes.json.IncomingEvent
import stella.events.it.IntegrationTestBase
import stella.events.persistence.RedissonSupport
import stella.events.utils.ConstantClock

class EventIngestorRoutesIntegrationSpec
    extends AnyWordSpec
    with ScalatestRouteTest
    with should.Matchers
    with IntegrationTestBase
    with ScalaCheckDrivenPropertyChecks
    with OptionValues {

  private type EventOrAdminEvent[T] = (IncomingEvent with IncomingAdminEvent) <:< T

  private val submitEventPath = "event_ingestor/event"
  private val submitEventAsSuperAdminPath = "event_ingestor/superadmin/any/event"
  private val submitEventAsAdminPath = "event_ingestor/admin/any/event"
  private val authHeader = Authorization(OAuth2BearerToken("token"))
  private val dummyPrimaryProjectPublicId =
    UUID.fromString("2353130a-e2b3-47e9-a2cb-3ade99f81b04") // defined in it/application.conf as test-project-id
  private val event1 = incomingEventGen.sample.value
  private val event2 = incomingEventGen.sample.value
  private val event3 = incomingEventGen.sample.value
  private val superAdminEvent1 =
    incomingAdminEventGen.sample.value.copy(onBehalfOfProjectId = Some(dummyPrimaryProjectPublicId))
  private val superAdminEvent2 =
    incomingAdminEventGen.sample.value.copy(onBehalfOfProjectId = Some(dummyPrimaryProjectPublicId))
  private val superAdminEvent3 =
    incomingAdminEventGen.sample.value.copy(onBehalfOfProjectId = Some(dummyPrimaryProjectPublicId))
  private val adminEvent1 =
    incomingAdminEventGen.sample.value.copy(onBehalfOfProjectId = Some(dummyPrimaryProjectPublicId))
  private val adminEvent2 = incomingAdminEventGen.sample.value
  private val adminEvent3 = incomingAdminEventGen.sample.value
  private val testClock = ConstantClock.now()

  //TODO: Since we don't wait for ack we need to change what we check
  "submitting event requests via various endpoints" ignore {

    "store events in Kafka" in {
      val module = eventIngestorRoutesModule(testClock)
      val routes = module.routes
      implicit val submitEventRoutes: Route = Route.seal(routes.all)
      val groupId = UUID.randomUUID().toString

      // WHEN: we start Kafka publisher and send events
      withKafkaPublisherLoop(module) {
        submitEvent(event1)
        submitEvent(event2)
        submitEventAsSuperAdmin(superAdminEvent1)
        submitEventAsSuperAdmin(superAdminEvent2)
        submitEventAsAdmin(adminEvent1)
        submitEventAsAdmin(adminEvent2)
        submitEvent(event3)
        submitEventAsSuperAdmin(superAdminEvent3)
        submitEventAsAdmin(adminEvent3)

        withRedissonClient(module) { redisList =>
          implicit val auth: DisabledJwtAuthorization =
            module.jwtAuthorization.asInstanceOf[DisabledJwtAuthorization]
          // THEN: eventually events are stored in Kafka in correct order and don't exist anymore in Redis collection
          val eventsFromKafka = getRecordsFromKafka(module.kafkaConfig, groupId, expectedRecordsNumber = 9)
          checkEventsFromKafka(
            eventsFromKafka,
            expectedEvents = event1,
            event2,
            superAdminEvent1,
            superAdminEvent2,
            adminEvent1,
            adminEvent2,
            event3,
            superAdminEvent3,
            adminEvent3)
          redisList should have size 0
        }
      }
    }

    "preserve events in Redis when Kafka is not available and move events to Kafka later" in {
      val correctConfig = prepareEventIngestorConfig()
      val moduleWithoutKafkaConnection = new EventIngestorRoutesModule {
        // note we intentionally use Redis address as Kafka address
        override lazy val config: EventIngestorConfig =
          correctConfig.copy(kafka = correctConfig.kafka.copy(bootstrapServers =
            s"${redisContainer.container.getContainerIpAddress}:$redisMappedPort"))
        override implicit val clock: Clock = testClock
      }
      val groupId = UUID.randomUUID().toString

      // WHEN: Kafka publisher is enabled but it points to wrong URI (so Kafka is unavailable)
      // and we publish events
      withKafkaPublisherLoop(moduleWithoutKafkaConnection) {
        val routes = moduleWithoutKafkaConnection.routes
        implicit val submitEventRoutes: Route = Route.seal(routes.all)

        submitEvent(event1)
        submitEvent(event2)
        submitEventAsSuperAdmin(superAdminEvent1)
        submitEventAsSuperAdmin(superAdminEvent2)
        submitEventAsAdmin(adminEvent1)
        submitEventAsAdmin(adminEvent2)

        withRedissonClient(moduleWithoutKafkaConnection) { redisList =>
          implicit val auth: DisabledJwtAuthorization =
            moduleWithoutKafkaConnection.jwtAuthorization.asInstanceOf[DisabledJwtAuthorization]
          // THEN: events are stored in Redis in correct order and are not yet available in Kafka
          redisList should have size 6
          val eventsFromRedis = redisList.iterator().asScala.toList
          checkEventsFromRedis(
            eventsFromRedis,
            expectedEvents = event1,
            event2,
            superAdminEvent1,
            superAdminEvent2,
            adminEvent1,
            adminEvent2)
          getRecordsFromKafka(correctConfig.kafka, groupId, expectedRecordsNumber = 0)
        }
      }

      val moduleWithKafkaConnection = eventIngestorRoutesModule(testClock)
      // WHEN: we start publisher with correct Kafka URI and send additional events
      withKafkaPublisherLoop(moduleWithKafkaConnection) {
        val routes = moduleWithKafkaConnection.routes
        implicit val submitEventRoutes: Route = Route.seal(routes.all)

        submitEventAsSuperAdmin(superAdminEvent3)
        submitEventAsAdmin(adminEvent3)
        submitEvent(event3)

        withRedissonClient(moduleWithKafkaConnection) { redisList =>
          implicit val auth: DisabledJwtAuthorization =
            moduleWithKafkaConnection.jwtAuthorization.asInstanceOf[DisabledJwtAuthorization]
          // THEN: old and new events are stored in Kafka in correct order and are removed from Redis
          val eventsFromKafka =
            getRecordsFromKafka(moduleWithKafkaConnection.kafkaConfig, groupId, expectedRecordsNumber = 9)
          checkEventsFromKafka(
            eventsFromKafka,
            expectedEvents = event1,
            event2,
            superAdminEvent1,
            superAdminEvent2,
            adminEvent1,
            adminEvent2,
            superAdminEvent3,
            adminEvent3,
            event3)
          redisList should have size 0
        }
      }
    }
  }

  private def withKafkaPublisherLoop[T](module: EventIngestorRoutesModule)(body: => T): T = {
    module.eventPublisher.startPublisherLoop()
    try {
      body
    } finally {
      module.persistenceService.stopGracefully()
      module.eventPublisher.stopGracefully()
      module.kafkaPublisher.stopGracefully()
    }
  }

  private def withRedissonClient[T](module: EventIngestorRoutesModule)(body: util.Deque[EventData] => T): Unit = {
    val _ = new RedissonSupport {
      override val redissonConfig: Config = module.redissonConfig
      override val redisPersistenceConfig: RedisPersistenceConfig = module.redisPersistenceConfig

      try {
        body(redisList)
      } finally {
        redissonClient.shutdown()
      }
    }
  }

  private def getRecordsFromKafka(
      kafkaConfig: KafkaProducerConsumerConfig,
      groupId: SchemaRegistryUrl,
      expectedRecordsNumber: Int) = {
    val properties =
      KafkaAvroConsumerProperties.fromConfig(
        kafkaConfig.bootstrapServers,
        kafkaConfig.consumer.copy(groupId = groupId),
        kafkaConfig.serializer)
    val kafkaConsumer = new KafkaConsumer[EventKey, EventEnvelope](properties)
    try {
      kafkaConsumer.subscribe(singletonList(kafkaConfig.topicName))
      var records: List[ConsumerRecord[EventKey, EventEnvelope]] = Nil
      eventually {
        val consumerRecords =
          kafkaConsumer.poll(JDuration.ofNanos(kafkaConfig.consumer.kafkaPollTimeout.toNanos))
        records = records ++ consumerRecords.records(kafkaConfig.topicName).asScala
        records should have size expectedRecordsNumber
        records
      }
    } finally {
      kafkaConsumer.close()
    }
  }

  private def submitEvent(event: IncomingEvent)(implicit submitEventRoutes: Route) = {
    Post(submitEventPath, event) ~> authHeader ~> submitEventRoutes ~> check {
      status shouldBe StatusCodes.OK
    }
  }

  private def submitEventAsSuperAdmin(event: IncomingAdminEvent)(implicit submitEventRoutes: Route) = {
    Post(submitEventAsSuperAdminPath, event) ~> authHeader ~> submitEventRoutes ~> check {
      status shouldBe StatusCodes.OK
    }
  }

  private def submitEventAsAdmin(event: IncomingAdminEvent)(implicit submitEventRoutes: Route) = {
    Post(submitEventAsAdminPath, event) ~> authHeader ~> submitEventRoutes ~> check {
      status shouldBe StatusCodes.OK
    }
  }

  private def checkEventsFromRedis[T](currentEvents: Seq[EventData], expectedEvents: T*)(implicit
      ev: EventOrAdminEvent[T],
      auth: DisabledJwtAuthorization): Unit =
    checkEvents(currentEvents.map(data => (data.getKey, data.getValue)), expectedEvents)

  private def checkEventsFromKafka[T](
      currentEvents: Seq[ConsumerRecord[EventKey, EventEnvelope]],
      expectedEvents: T*)(implicit ev: EventOrAdminEvent[T], auth: DisabledJwtAuthorization): Unit =
    checkEvents(currentEvents.map(record => (record.key(), record.value())), expectedEvents)

  private def checkEvents[T](currentEvents: Seq[(EventKey, EventEnvelope)], expectedEvents: Seq[T])(implicit
      ev: EventOrAdminEvent[T],
      auth: DisabledJwtAuthorization): Unit = {
    currentEvents should have size expectedEvents.size
    currentEvents.zip(expectedEvents).foreach { case ((currentKey, currentValue), expected) =>
      withClue(
        s"Event data should be the same.\nCurrent key: $currentKey\nCurrent value: $currentValue\nExpected: $expected\n") {
        expected match {
          case e: IncomingEvent =>
            checkUserEvent(auth, currentKey, currentValue, e)
          case e: IncomingAdminEvent =>
            checkAdminEvent(auth, currentKey, currentValue, e)
          case _ => fail("There should not be other types of incoming events")
        }
        currentValue.getMessageProcessingDateUTC.toString shouldBe testClock.currentUtcOffsetDateTime().toString
      }
    }
  }

  private def checkUserEvent(
      auth: DisabledJwtAuthorization,
      currentKey: EventKey,
      currentValue: EventEnvelope,
      e: IncomingEvent) = {
    currentKey.getProjectId.toString shouldBe auth.dummyProjectId.toString
    currentKey.getUserId.toString shouldBe auth.dummyUserId.toString
    currentValue.getSource shouldBe Source.external
    currentValue.getMessageOriginDateUTC.toString shouldBe e.messageOriginDateUTC.toString
    currentValue.getEventName.toString shouldBe e.eventName
    currentValue.getPayload.asScala.map(_.toString) shouldBe e.payload.map(_.toDataApi.toString)
  }

  private def checkAdminEvent(
      auth: DisabledJwtAuthorization,
      currentKey: EventKey,
      currentValue: EventEnvelope,
      e: IncomingAdminEvent) = {
    currentKey.getUserId.toString shouldBe e.onBehalfOfUserId.getOrElse(auth.dummyUserId).toString
    currentValue.getSource shouldBe e.source.getOrElse(Source.external)
    currentValue.getMessageOriginDateUTC.toString shouldBe e.messageOriginDateUTC.toString
    currentValue.getEventName.toString shouldBe e.eventName
    currentValue.getPayload.asScala.map(_.toString) shouldBe e.payload.map(_.toDataApi.toString)
    currentKey.getProjectId.toString shouldBe e.onBehalfOfProjectId.getOrElse(auth.dummyProjectId).toString
  }
}
