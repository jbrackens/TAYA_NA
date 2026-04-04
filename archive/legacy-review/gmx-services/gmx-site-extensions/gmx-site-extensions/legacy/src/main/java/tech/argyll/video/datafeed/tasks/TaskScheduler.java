package tech.argyll.video.datafeed.tasks;

import com.google.inject.Injector;
import javax.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import org.quartz.CronScheduleBuilder;
import org.quartz.JobBuilder;
import org.quartz.JobDetail;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.TriggerBuilder;
import org.quartz.impl.StdSchedulerFactory;
import tech.argyll.video.datafeed.config.GuiceJobFactory;

@Slf4j
public class TaskScheduler {

  private final Scheduler quartzScheduler;

  @Inject
  public TaskScheduler(final Injector injector) throws SchedulerException {
    quartzScheduler = StdSchedulerFactory.getDefaultScheduler();
    quartzScheduler.setJobFactory(injector.getInstance(GuiceJobFactory.class));
    quartzScheduler.start();
  }

  public void scheduleTasks() throws SchedulerException {
    scheduleDataCollector();
    scheduleDBCleanup();
    scheduleEventURLsCheck();
  }

  private void scheduleDataCollector() throws SchedulerException {
    JobDetail dataCollector = JobBuilder.newJob(DataCollector.class)
        .withIdentity("DataCollector", "group1")
        .storeDurably()
        .build();

    quartzScheduler.addJob(dataCollector, false);

    log.info("Running DataCollector initially");
    quartzScheduler.scheduleJob(TriggerBuilder.newTrigger()
        .withIdentity("DataCollectorInit", "group1")
        .startNow()
        .forJob("DataCollector", "group1")
        .build());

    int executionOffset = (int) (System.currentTimeMillis() % 10);
    String every10Minutes = String.format("0 %s/10 * * * ?", executionOffset);
    log.info("Scheduling DataCollector with cron - {}", every10Minutes);
    quartzScheduler.scheduleJob(TriggerBuilder.newTrigger()
        .withIdentity("DataCollectorScheduled", "group1")
        .startNow()
        .withSchedule(CronScheduleBuilder.cronSchedule(every10Minutes))
        .forJob("DataCollector", "group1")
        .build());
  }

  private void scheduleDBCleanup() throws SchedulerException {
    JobDetail job = JobBuilder.newJob(DBCleanup.class)
        .withIdentity("DBCleanup", "group1")
        .storeDurably()
        .build();

    quartzScheduler.addJob(job, false);

    log.info("Running DBCleanup initially");
    quartzScheduler.scheduleJob(TriggerBuilder.newTrigger()
        .withIdentity("DBCleanupInit", "group1")
        .startNow()
        .forJob("DBCleanup", "group1")
        .build());

    String dailyAt6AM = "0 0 6am * * ?";
    log.info("Scheduling DBCleanup with cron - {}", dailyAt6AM);
    quartzScheduler.scheduleJob(TriggerBuilder.newTrigger()
        .withIdentity("DBCleanupScheduled", "group1")
        .startNow()
        .withSchedule(CronScheduleBuilder.cronSchedule(dailyAt6AM))
        .forJob("DBCleanup", "group1")
        .build());
  }

  private void scheduleEventURLsCheck() throws SchedulerException {
    JobDetail job = JobBuilder.newJob(EventURLsCheck.class)
        .withIdentity("EventURLsCheck", "group1")
        .storeDurably()
        .build();

    quartzScheduler.addJob(job, false);

    log.info("Running EventURLsCheck initially");
    quartzScheduler.scheduleJob(TriggerBuilder.newTrigger()
        .withIdentity("EventURLsCheckInit", "group1")
        .startNow()
        .forJob("EventURLsCheck", "group1")
        .build());

    String dailyAt8AM = "0 0 8am * * ?";
    log.info("Scheduling EventURLsCheck with cron - {}", dailyAt8AM);
    quartzScheduler.scheduleJob(TriggerBuilder.newTrigger()
        .withIdentity("EventURLsCheckScheduled", "group1")
        .startNow()
        .withSchedule(CronScheduleBuilder.cronSchedule(dailyAt8AM))
        .forJob("EventURLsCheck", "group1")
        .build());
  }
}
