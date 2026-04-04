package tech.argyll.video.datafeed;

import com.google.inject.Injector;
import java.util.Arrays;
import javax.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import org.quartz.SchedulerException;
import tech.argyll.video.core.sbtech.SBTechOperatorType;
import tech.argyll.video.datafeed.config.DataFeedConfig;
import tech.argyll.video.datafeed.tasks.TaskScheduler;

@Slf4j
public class DataFeedApplication {

  @Inject
  private ConfigSynchronizer configSynchronizer;

  @Inject
  private TaskScheduler scheduler;

  public static void main(String[] args) throws SchedulerException {
    log.info("Starting up...");
    if (args.length != 1) {
      String errorMessage = String.format(
        "Wrong number of arguments. One argument (operator type) required but was %s",
        Arrays.toString(args)
      );
      log.error(errorMessage);
      throw new IllegalArgumentException(errorMessage);
    }
    SBTechOperatorType operatorType = SBTechOperatorType.valueOf(args[0]);
    log.info("Using operator type '{}'", operatorType);
    DataFeedConfig config = new DataFeedConfig(operatorType);
    Injector injector = config.getInjector();

    DataFeedApplication app = prepareApp(injector);
    app.run();
  }

  private static DataFeedApplication prepareApp(Injector injector) {
    try {
      return injector.getInstance(DataFeedApplication.class);
    } catch (Exception e) {
      log.error("Error initializing Guice", e);
      throw e;
    }
  }

  public void run() throws SchedulerException {
    configSynchronizer.syncSBTechConfig();
    scheduler.scheduleTasks();
  }
}
