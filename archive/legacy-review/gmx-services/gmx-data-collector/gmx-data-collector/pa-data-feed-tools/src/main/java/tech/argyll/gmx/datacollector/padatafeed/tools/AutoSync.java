package tech.argyll.gmx.datacollector.padatafeed.tools;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class AutoSync {

  private static final int START_DELAY = 0;
  private static final int SYNC_INTERVAL = 60 * 1000;

  private static ExecutorService syncScheduler;
  private static Timer timer;

  private static String[] args;

  public static void main(String[] args) {
    AutoSync.args = args;
    start();
  }

  private static void start() {
    if (timer == null) {
      timer = new Timer();
    }

    if (syncScheduler == null) {
      syncScheduler = prepareExecutor("s3-sync", 1);
    }

    scheduleChecks();
  }

  private static void stop() {
    if (timer != null) {
      log.info("Killing timer");
      timer.cancel();
      timer = null;
    }

    if (syncScheduler != null) {
      log.info("Killing syncScheduler");
      syncScheduler.shutdownNow();
      syncScheduler = null;
    }
  }

  private static ExecutorService prepareExecutor(String name, int size) {
    final BlockingQueue<Runnable> queue = new ArrayBlockingQueue<>(size * 3);

    final ThreadFactory threadFactory =
        new ThreadFactoryBuilder().setNameFormat(name + "-%d").setDaemon(true).build();

    return new ThreadPoolExecutor(size, size, 0L, TimeUnit.MILLISECONDS, queue, threadFactory);
  }

  private static void scheduleChecks() {
    timer.scheduleAtFixedRate(
        new RunSync(),
        START_DELAY,
        SYNC_INTERVAL);
  }

  private static class RunSync extends TimerTask {

    @Override
    public void run() {
      log.info("Run scheduled sync");
      try {
        SendS3ToFeed.main(args);
      } catch (Exception e) {
        log.error("Could not run SendS3ToFeed.main()", e);
      }
    }
  }
}
