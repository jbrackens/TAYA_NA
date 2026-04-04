package tech.argyll.video.datafeed.config;

import com.google.inject.Injector;
import javax.inject.Inject;
import org.quartz.Job;
import org.quartz.JobDetail;
import org.quartz.Scheduler;
import org.quartz.spi.JobFactory;
import org.quartz.spi.TriggerFiredBundle;

public class GuiceJobFactory implements JobFactory {
  private final Injector guice;

  @Inject
  public GuiceJobFactory(final Injector guice) {
    this.guice = guice;
  }

  @Override
  public Job newJob(TriggerFiredBundle triggerFiredBundle, Scheduler scheduler) {
    JobDetail jobDetail = triggerFiredBundle.getJobDetail();
    Class<? extends Job> jobClass = jobDetail.getJobClass();

    try {
      return guice.getInstance(jobClass);
    } catch (Exception e) {
      e.printStackTrace();

      throw new UnsupportedOperationException(e);
    }
  }
}