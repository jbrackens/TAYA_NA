package gmx.widget.siteextentions.datafeed.service

import java.util.TimeZone

import scala.concurrent.duration.FiniteDuration

import com.google.inject.AbstractModule
import com.google.inject.Guice
import com.typesafe.scalalogging.LazyLogging
import org.quartz._
import org.quartz.impl.StdSchedulerFactory
import tech.argyll.video.datafeed.config.GuiceJobFactory

import gmx.widget.siteextentions.datafeed.service.persistence.MessageLogService
import gmx.widget.siteextentions.datafeed.service.persistence.MessageToRetryService
import gmx.widget.siteextentions.datafeed.service.persistence.StoreUpdateMessageService
import gmx.widget.siteextentions.datafeed.service.sportevents.source.KafkaEventSource

class MessageRetriesScheduler(
    storeUpdateMessageService: StoreUpdateMessageService,
    messageToRetryService: MessageToRetryService,
    messageLogService: MessageLogService,
    // TODO we shouldn't use flow and source like that
    sportEventSource: KafkaEventSource,
    cleanUpMessagesRetriedEarlierThan: FiniteDuration)
    extends LazyLogging {

  private lazy val quartzScheduler: Scheduler = initScheduler()

  def scheduleMessageRetries(frequencyInSeconds: Int): Unit = {
    val partnerType = messageToRetryService.partnerType
    val jobIdentity = s"MessageRetriesJob_$partnerType"
    val group = "group1"
    val retriesScheduler =
      JobBuilder.newJob(classOf[MessageRetriesJob]).withIdentity(jobIdentity, group).storeDurably.build

    quartzScheduler.addJob(retriesScheduler, false)

    logger.info(s"Running MessageRetriesJob for partner {} initially", partnerType)
    quartzScheduler.scheduleJob(
      TriggerBuilder.newTrigger
        .withIdentity(s"MessageRetriesJobInit_$partnerType", group)
        .startNow
        .forJob(jobIdentity, group)
        .build)

    logger.info(
      "Scheduling MessageRetriesJob for partner {} to be run every {} seconds",
      partnerType,
      frequencyInSeconds)
    quartzScheduler.scheduleJob(
      TriggerBuilder
        .newTrigger()
        .withIdentity(s"MessageRetriesJobScheduled_$partnerType", group)
        .startNow()
        .withSchedule(SimpleScheduleBuilder.repeatSecondlyForever(frequencyInSeconds))
        .forJob(jobIdentity, group)
        .build())
  }

  def scheduleCleanupJob(cronTrigger: String, timeZone: TimeZone): Unit = {
    val partnerType = messageToRetryService.partnerType
    val jobIdentity = s"MessageToRetryCleanupJob_$partnerType"
    val group = "group2"
    val cleanupScheduler =
      JobBuilder.newJob(classOf[MessageToRetryCleanupJob]).withIdentity(jobIdentity, group).storeDurably.build

    quartzScheduler.addJob(cleanupScheduler, false)

    logger.info(
      "Scheduling MessageToRetryCleanupJob to be run at {} using time zone {}",
      cronTrigger,
      timeZone.toZoneId)
    quartzScheduler.scheduleJob(
      TriggerBuilder
        .newTrigger()
        .withIdentity(s"MessageToRetryCleanupJobScheduled_$partnerType", group)
        .startNow()
        .withSchedule(CronScheduleBuilder.cronSchedule(cronTrigger).inTimeZone(timeZone))
        .forJob(jobIdentity, group)
        .build())
  }

  private def initScheduler(): Scheduler = {
    val schedulerFactory = new StdSchedulerFactory
    val quartzScheduler: Scheduler = schedulerFactory.getScheduler
    val injector = Guice.createInjector(new AbstractModule {
      override def configure(): Unit = {
        val job =
          new MessageRetriesJob(storeUpdateMessageService, messageToRetryService, messageLogService, sportEventSource)
        bind(classOf[MessageRetriesJob]).toInstance(job)
        val cleanupJob = new MessageToRetryCleanupJob(messageToRetryService, cleanUpMessagesRetriedEarlierThan)
        bind(classOf[MessageToRetryCleanupJob]).toInstance(cleanupJob)
      }
    })
    val jobFactory = new GuiceJobFactory(injector)
    quartzScheduler.setJobFactory(jobFactory)
    quartzScheduler.start()
    quartzScheduler
  }
}
