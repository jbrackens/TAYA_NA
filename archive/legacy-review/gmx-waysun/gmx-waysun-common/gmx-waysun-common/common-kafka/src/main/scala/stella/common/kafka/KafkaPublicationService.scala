package stella.common.kafka

import scala.concurrent.Await
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.TimeoutException
import scala.concurrent.duration.Duration

import cats.data.EitherT
import org.apache.kafka.clients.producer.KafkaProducer
import org.apache.kafka.clients.producer.ProducerRecord
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import stella.common.kafka.KafkaPublicationServiceImpl.EventSubmissionError
import stella.common.kafka.KafkaPublicationServiceImpl.EventSubmissionTimeoutException
import stella.common.kafka.KafkaPublicationServiceImpl.UnexpectedEventSubmissionException
import stella.common.kafka.config.KafkaProducerConfig

trait KafkaPublicationService[K, V >: Null] {
  def publish(key: K, value: Option[V])(implicit
      ec: ExecutionContext): EitherT[Future, EventSubmissionError, KafkaPublicationInfo]

  def publishAndForget(key: K, value: Option[V])(implicit
      ec: ExecutionContext): EitherT[Future, EventSubmissionError, Unit]

  def stopGracefully(): Unit
}

class KafkaPublicationServiceImpl[K, V >: Null](kafkaConfig: KafkaProducerConfig)
    extends KafkaPublicationService[K, V] {
  import KafkaPublicationServiceImpl.log
  private val producer =
    new KafkaProducer[K, V](
      KafkaAvroProducerProperties
        .fromConfig(kafkaConfig.bootstrapServers, kafkaConfig.producer, kafkaConfig.serializer))

  override def publish(key: K, value: Option[V])(implicit
      ec: ExecutionContext): EitherT[Future, EventSubmissionError, KafkaPublicationInfo] = {
    EitherT {
      Future {
        val record = new ProducerRecord[K, V](kafkaConfig.topicName, key, value.orNull[V])
        try {
          val timeLimit = kafkaConfig.producer.publicationTimeLimit.getOrElse(Duration.Inf)
          val publicationResult = Await.result(Future(producer.send(record).get()), timeLimit)
          val publicationInfo = KafkaPublicationInfo.fromRecordMetadata(publicationResult)
          log.trace(s"$value published with $key to Kafka with $publicationInfo")
          Right(publicationInfo)
        } catch {
          case e: TimeoutException =>
            log.error("Timeout when sending record to Kafka", e)
            Left(EventSubmissionTimeoutException(e))
          case e: Throwable =>
            log.error(s"Couldn't publish a $record", e)
            Left(UnexpectedEventSubmissionException("Couldn't publish a message", e))
        } finally {
          producer.flush()
        }
      }
    }
  }

  override def stopGracefully(): Unit = {
    log.info("Closing Kafka producer")
    producer.close()
  }

  override def publishAndForget(key: K, value: Option[V])(implicit
      ec: ExecutionContext): EitherT[Future, EventSubmissionError, Unit] = {
    EitherT {
      Future {
        val record = new ProducerRecord[K, V](kafkaConfig.topicName, key, value.orNull[V])
        try {
          producer.send(record)
          log.trace(s"$value published with $key to Kafka")
          Right(())
        } catch {
          case e: TimeoutException =>
            log.error("Timeout when sending record to Kafka", e)
            Left(EventSubmissionTimeoutException(e))
          case e: Throwable =>
            log.error(s"Couldn't publish a $record", e)
            Left(UnexpectedEventSubmissionException("Couldn't publish a message", e))
        }
      }
    }
  }
}

object KafkaPublicationServiceImpl {
  private val log: Logger = LoggerFactory.getLogger(getClass)

  sealed trait EventSubmissionError

  final case class EventSubmissionTimeoutException(underlying: Throwable) extends EventSubmissionError

  final case class UnexpectedEventSubmissionException(details: String, underlying: Throwable)
      extends EventSubmissionError
}
