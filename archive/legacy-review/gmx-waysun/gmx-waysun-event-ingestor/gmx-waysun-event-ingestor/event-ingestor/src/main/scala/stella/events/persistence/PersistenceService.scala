package stella.events.persistence

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.blocking

import cats.data.EitherT
import org.redisson.config.Config
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import stella.common.kafka.KafkaPublicationService
import stella.common.kafka.KafkaPublicationServiceImpl
import stella.dataapi.platformevents.EventData
import stella.dataapi.platformevents.EventEnvelope
import stella.dataapi.platformevents.EventKey

import stella.events.EventIngestorBoundedContext.EventSubmissionError
import stella.events.EventIngestorBoundedContext.UnexpectedEventSubmissionException
import stella.events.config.RedisPersistenceConfig

trait PersistenceService {
  def storeEvent(key: EventKey, eventEnvelope: EventEnvelope)(implicit
      ec: ExecutionContext): EitherT[Future, EventSubmissionError, Unit]

  def stopGracefully(): Unit
}

class RedisPersistenceService(
    override val redissonConfig: Config,
    override val redisPersistenceConfig: RedisPersistenceConfig)
    extends PersistenceService
    with RedissonSupport {

  import RedisPersistenceService._

  override def storeEvent(key: EventKey, eventEnvelope: EventEnvelope)(implicit
      ec: ExecutionContext): EitherT[Future, EventSubmissionError, Unit] =
    EitherT
      .right {
        Future {
          blocking {
            val data = new EventData(key, eventEnvelope)
            redisList.addLast(data)
          }
        }
      }
      .leftMap(e => handleRedisFailure(key, e))

  override def stopGracefully(): Unit = {
    log.info("Shutting down Redis client")
    redissonClient.shutdown()
  }

  private def handleRedisFailure(key: EventKey, e: Throwable) = {
    log.error(s"A problem occurred when trying to persist an event for key $key", e)
    UnexpectedEventSubmissionException(s"A problem occurred when trying to persist an event for key $key", e)
  }
}

object RedisPersistenceService {
  private val log: Logger = LoggerFactory.getLogger(getClass)
}

class KafkaPersistenceService(publisher: KafkaPublicationService[EventKey, EventEnvelope]) extends PersistenceService {

  import KafkaPersistenceService.log

  override def storeEvent(key: EventKey, eventEnvelope: EventEnvelope)(implicit
      ec: ExecutionContext): EitherT[Future, EventSubmissionError, Unit] = {
    publisher
      .publishAndForget(key, Some(eventEnvelope))
      .bimap(
        {
          case e: KafkaPublicationServiceImpl.EventSubmissionTimeoutException =>
            log.error(s"Couldn't publish event with key $key to Kafka due to timeout.", e.underlying)
            UnexpectedEventSubmissionException("Timeout when publishing to Kafka.", e.underlying)
          case e: KafkaPublicationServiceImpl.UnexpectedEventSubmissionException =>
            log.error(
              s"Couldn't publish event with key $key to Kafka due to unexpected error ${e.details}.",
              e.underlying)
            UnexpectedEventSubmissionException(e.details, e.underlying)
        },
        _ => ())
  }

  override def stopGracefully(): Unit = {
    // nothing to do
  }
}

object KafkaPersistenceService {
  private val log: Logger = LoggerFactory.getLogger(getClass)
}
