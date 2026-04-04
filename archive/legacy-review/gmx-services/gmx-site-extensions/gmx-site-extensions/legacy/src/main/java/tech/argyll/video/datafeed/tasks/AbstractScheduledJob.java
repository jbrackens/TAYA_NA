package tech.argyll.video.datafeed.tasks;

import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.slf4j.Logger;
import org.slf4j.MDC;
import tech.argyll.video.common.UUID;

public abstract class AbstractScheduledJob<T> implements Job {

  @Override
  public void execute(JobExecutionContext jobExecutionContext) {
    String executionId = UUID.uuid();
    MDC.put("executionId", executionId);
    try {
      logger().info("START Job");
      doExecute();

      logger().info("END Job");
    } finally {
      MDC.remove("executionId");
    }
  }

  public abstract T doExecute();

  public abstract Logger logger();

}
