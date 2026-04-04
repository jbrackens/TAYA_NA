package stella.events.persistence

import scala.concurrent.Await
import scala.concurrent.ExecutionContext
import scala.concurrent.duration.Duration
import scala.util.Failure
import scala.util.Success
import scala.util.Try
import scala.util.control.NonFatal

import org.quartz._
import org.quartz.impl.StdSchedulerFactory
import org.quartz.simpl.SimpleJobFactory
import org.quartz.spi.TriggerFiredBundle
import org.redisson.config.Config
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import stella.common.kafka.KafkaPublicationService
import stella.common.kafka.KafkaPublicationServiceImpl.EventSubmissionTimeoutException
import stella.common.kafka.KafkaPublicationServiceImpl.UnexpectedEventSubmissionException
import stella.dataapi.platformevents.EventData
import stella.dataapi.platformevents.EventEnvelope
import stella.dataapi.platformevents.EventKey

import stella.events.config.RedisPersistenceConfig

class EventPublicationScheduler(
    override val redissonConfig: Config,
    override val redisPersistenceConfig: RedisPersistenceConfig,
    publisher: KafkaPublicationService[EventKey, EventEnvelope],
    consumer: KafkaConsumerService)(implicit ec: ExecutionContext)
    extends EventPublisher
    with RedissonSupport {
  import EventPublicationScheduler.log

  private var stopRequested = false

  @DisallowConcurrentExecution
  class EventPublicationJob extends Job {

    private var isLeader = false

    override def execute(context: JobExecutionContext): Unit = {
      log.debug(s"Start job [isLeader = $isLeader]")
      if (isLeader) handleStoredEvents()
      else {
        Try(acquireLockOrWait()) match {
          case Success(_) =>
            handleStoredEvents()
          case Failure(e) =>
            log.error("Failure when waiting to obtain leader lock", e)
        }
      }
      log.debug(s"End job [isLeader = $isLeader]")
    }

    private def handleStoredEvents(): Unit = {
      try {
        val wasNotLeader = !isLeader
        var valueFromRedis = redisList.peekFirst()
        if (wasNotLeader) {
          log.info("Service elected as a leader and will publish the messages to Kafka")
          if (valueFromRedis != null) {
            // read last message to don't duplicate it after new leader election after some failure
            val lastPublishedEventIdOpt = consumer.pollLastStoredEventId()
            if (lastPublishedEventIdOpt.contains(valueFromRedis.getValue.getMessageId)) {
              redisList.removeFirst()
              valueFromRedis = redisList.peekFirst()
            }
          }
          isLeader = true
        }
        while (!stopRequested && valueFromRedis != null) {
          val publishedSuccessfully = publishToKafka(valueFromRedis)
          if (publishedSuccessfully) {
            redisList.removeFirst()
            valueFromRedis = redisList.peekFirst()
          }
        }
      } catch {
        case NonFatal(e) => log.error("Failure when handling stored events", e)
      }
    }

    private def publishToKafka(valueFromRedis: EventData): Boolean = {
      Await.result(publisher.publish(valueFromRedis.getKey, Some(valueFromRedis.getValue)).value, Duration.Inf) match {
        case Right(_) => true
        case Left(EventSubmissionTimeoutException(underlying)) =>
          log.error("Leader couldn't publish event from Redis to Kafka due to timeout.", underlying)
          false
        case Left(UnexpectedEventSubmissionException(details, underlying)) =>
          log.error(s"Unexpectedly leader couldn't publish event from Redis to Kafka. $details", underlying)
          false
      }
    }

    private def acquireLockOrWait(): Unit = {
      // it will be automatically unlocked thanks to watchdog timeout in case a leader is not available anymore
      val leaderLock = redissonClient.getLock(redisPersistenceConfig.leaderLockName)
      leaderLock.lock()
    }
  }

  private lazy val quartzScheduler: Scheduler = initScheduler()

  override def startPublisherLoop(): Unit = {
    val jobIdentity = "EventPublicationJob"
    val group = "group1"
    val jobDetails =
      JobBuilder.newJob(classOf[EventPublicationJob]).withIdentity(jobIdentity, group).storeDurably.build

    quartzScheduler.addJob(jobDetails, false)

    log.info("Running EventPublicationJob initially")
    quartzScheduler.scheduleJob(
      TriggerBuilder.newTrigger
        .withIdentity("EventPublicationJobInit", group)
        .startNow
        .forJob(jobIdentity, group)
        .build)

    val frequency = redisPersistenceConfig.eventToPublishCheckFrequencySeconds
    log.info(s"Scheduling EventPublicationJob run every $frequency seconds")
    val _ = quartzScheduler.scheduleJob(
      TriggerBuilder
        .newTrigger()
        .withIdentity("EventPublicationJobScheduled", group)
        .startNow()
        .withSchedule(SimpleScheduleBuilder.repeatSecondlyForever(frequency))
        .forJob(jobIdentity, group)
        .build())
  }

  override def stopGracefully(): Unit = {
    log.info("Shutting down Redis client")
    stopRequested = true
    redissonClient.shutdown()
    quartzScheduler.shutdown()
  }

  private def initScheduler(): Scheduler = {
    val schedulerFactory = new StdSchedulerFactory
    val quartzScheduler: Scheduler = schedulerFactory.getScheduler
    val job = new EventPublicationJob
    quartzScheduler.setJobFactory(new SimpleJobFactory {
      override def newJob(bundle: TriggerFiredBundle, scheduler: Scheduler): Job = {
        if (bundle.getJobDetail.getJobClass == classOf[EventPublicationJob]) job
        else super.newJob(bundle, scheduler)
      }
    })
    quartzScheduler.start()
    quartzScheduler
  }
}

object EventPublicationScheduler {
  private val log: Logger = LoggerFactory.getLogger(getClass)
}
