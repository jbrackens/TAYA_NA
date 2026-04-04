package tech.argyll.gmx.predictorgame.eventprocessor

import java.io.ByteArrayInputStream
import java.time.Duration
import java.time.temporal.ChronoUnit
import java.util.concurrent.TimeUnit
import java.util.{Collections, Properties}

import com.typesafe.config.ConfigFactory
import com.typesafe.scalalogging.LazyLogging
import net.press.pa.delivery.betting.Meeting
import org.apache.commons.lang3.StringUtils
import org.apache.kafka.clients.consumer.KafkaConsumer
import org.apache.kafka.common.serialization.StringDeserializer
import tech.argyll.gmx.predictorgame.domain.DbConfiguration
import tech.argyll.gmx.predictorgame.domain.repository.{EventRepository, RoundRepository}
import tech.argyll.gmx.predictorgame.engine.ScoreCalculator
import tech.argyll.gmx.predictorgame.engine.racing._
import tech.argyll.gmx.predictorgame.eventprocessor.parser.BettingParser

import scala.collection.JavaConverters._
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.{Await, Future}

object KafkaEventConsumer extends App with LazyLogging with DbConfiguration {

  val conf = ConfigFactory.load()

  val properties = new Properties()
  properties.put("bootstrap.servers", conf.getString("app.events.kafka.bootstrap"))
  properties.put("group.id", conf.getString("app.events.kafka.group"))
  properties.put("key.deserializer", classOf[StringDeserializer])
  properties.put("value.deserializer", classOf[StringDeserializer])

  val kafkaConsumer = new KafkaConsumer[String, String](properties)
  kafkaConsumer.subscribe(Collections.singletonList(conf.getString("app.events.kafka.topic")))

  val kafkaPollTimeout = Duration.of(conf.getDuration("app.events.kafka.poll", TimeUnit.SECONDS), ChronoUnit.SECONDS)


  val bettingParser: BettingParser = new BettingParser
  val engine: ProcessorEngine = new ProcessorEngine(
    config,
    new EventUpdater(config, new EventRepository(config)),
    new ScoreCalculator(config),
    new RoundRepository(config)
  )
  val updateExtractor = new HorseRacingUpdateExtractor

  while (true) {
    val results = kafkaConsumer.poll(kafkaPollTimeout).asScala
    for (record <- results) {

      logger.info("===============")
      logger.debug(record.key())
      logger.debug(record.value())

      val meetings = bettingParser.parse(new ByteArrayInputStream(record.value().getBytes))

      val events = meetings.asScala
        .filter(isValid)
        .flatMap(meeting =>
          meeting.getRace.asScala
            .flatMap(race => updateExtractor.prepareEventUpdate(meeting, race) +: race.getHorse.asScala.map(updateExtractor.prepareParticipantUpdate(race, _))))

      logger.info(s"Generated: ${events.size} events")

      Await.result(events
        .foldLeft(Future.successful[Any](()))
        ((future: Future[_], event: HorseRacingUpdate) => future.flatMap(_ => {
          logger.debug(s"Generated event: $event")
          event match {
            case eu: HorseRacingEventUpdate => engine.handleEventUpdate(eu)
            case epu: HorseRacingParticipantUpdate => engine.handleEventParticipantUpdate(epu)
          }
        })),
        scala.concurrent.duration.Duration.Inf)
    }
  }

  private def isValid(meeting: Meeting): Boolean = {
    //TODO filter out not supported DogRacing
    val valid = StringUtils.isNotEmpty(meeting.getId)
    if (!valid) {
      logger.info(s"Not supported file - rejected")
    }
    valid
  }
}