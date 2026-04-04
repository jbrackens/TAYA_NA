package stella.achievement.tools

import java.lang.{Long => JLong}
import java.util.UUID

import scala.concurrent.Await
import scala.concurrent.duration.DurationInt
import scala.jdk.CollectionConverters.SeqHasAsJava
import scala.util.Random

import org.slf4j.Logger
import org.slf4j.LoggerFactory

import stella.common.kafka.KafkaPublicationServiceImpl
import stella.common.kafka.config.KafkaProducerConfig
import stella.common.kafka.config.ProducerConfig
import stella.common.kafka.config.SerializerConfig
import stella.dataapi.achievement.event._

object TestAchievementsPublisher extends App {
  // scalastyle:off
  import scala.concurrent.ExecutionContext.Implicits.global
  // scalastyle:on

  private val log: Logger = LoggerFactory.getLogger(getClass)
  private val topicName = "stella.achievements3"
  private val schemaRegistryUrl = "http://stella.local:8081"
  private val bootstrapServers = "stella.local:9092"
  // to make scalastyle happy
  private val nullValue = None.orNull

  publishTestAchievements()

  def publishTestAchievements(): Unit = {
    val kafkaConfig = KafkaProducerConfig(
      topicName = topicName,
      bootstrapServers = bootstrapServers,
      serializer = SerializerConfig(schemaRegistryUrl),
      producer = ProducerConfig(
        acks = "all",
        clientId = "achievement-publisher",
        compressionType = "gzip",
        maxInFlightRequestsPerConnection = 1,
        maxNumberOfRetries = None,
        publicationTimeLimit = None))
    val publisher = new KafkaPublicationServiceImpl[AchievementEventKey, AchievementEvent](kafkaConfig)

    val achievementEventId1 = UUID.randomUUID().toString
    val achievementRuleId1 = UUID.randomUUID().toString
    val projectId1 = UUID.randomUUID().toString
    val currentMillis = System.currentTimeMillis()
    val baseRangeTime = Random.nextLong(currentMillis)
    val windowRangeStart: JLong = if (Random.nextBoolean()) baseRangeTime else nullValue
    val windowRangeEnd: JLong =
      if (Random.nextBoolean())
        Math.max(Random.nextLong(currentMillis), baseRangeTime) + Random.nextLong(100000000)
      else nullValue

    val achievementWithEvent =
      new AchievementEventKey(achievementEventId1, achievementRuleId1, projectId1) -> new AchievementEvent(
        /* messageOriginDateUTC =*/ Random.nextLong(currentMillis),
        /* groupByFieldValue =*/ "field1",
        /* actionType =*/ ActionType.EVENT,
        /* webhookDetails =*/ nullValue,
        /* eventDetails =*/ new EventDetails(
          achievementEventId1,
          List(
            new EventField( /* name =*/ "field1", /* valueType =*/ "string", /* value =*/ "foo field value"),
            new EventField( /* name =*/ "field2", /* valueType =*/ "boolean", /* value =*/ "true")).asJava),
        /* windowRangeStartUTC =*/ windowRangeStart,
        /* windowRangeEndUTC =*/ windowRangeEnd)
    val achievementWithWebhookWithEvent =
      new AchievementEventKey(achievementEventId1, achievementRuleId1, projectId1) -> new AchievementEvent(
        /* messageOriginDateUTC =*/ Random.nextLong(currentMillis),
        /* groupByFieldValue =*/ "fieldA",
        /* actionType =*/ ActionType.WEBHOOK,
        /* webhookDetails =*/ new WebhookDetails(
          /* requestType =*/ RequestType.POST,
          /* url =*/ "http://webhook.url.example.com",
          /* webhookEventDetails =*/ new WebhookEventDetails(
            achievementEventId1,
            List(
              new EventField( /* name =*/ "fieldA", /* valueType =*/ "integer", /* value =*/ "17"),
              new EventField( /* name =*/ "fieldB", /* valueType =*/ "boolean", /* value =*/ "false")).asJava)),
        /* eventDetails =*/ nullValue,
        /* windowRangeStartUTC =*/ windowRangeStart,
        /* windowRangeEndUTC =*/ windowRangeEnd)
    val achievementWithWebhookWithoutEvent =
      new AchievementEventKey(achievementEventId1, achievementRuleId1, projectId1) -> new AchievementEvent(
        /* messageOriginDateUTC =*/ Random.nextLong(currentMillis),
        /* groupByFieldValue =*/ "fieldA",
        /* actionType =*/ ActionType.WEBHOOK,
        /* webhookDetails =*/ new WebhookDetails(
          /* requestType =*/ RequestType.DELETE,
          /* url =*/ "http://webhook.url2.example.com",
          /* webhookEventDetails =*/ nullValue),
        /* eventDetails =*/ nullValue,
        /* windowRangeStartUTC =*/ windowRangeStart,
        /* windowRangeEndUTC =*/ windowRangeEnd)

    val messagesToSend = List(achievementWithEvent, achievementWithWebhookWithEvent, achievementWithWebhookWithoutEvent)
    log.info(s"About to publish ${messagesToSend.length} messages")
    messagesToSend.foreach { case (key, value) =>
      val future = publisher.publish(key, Some(value)).value
      Await.result(future, 5.seconds)
    }
  }
}
