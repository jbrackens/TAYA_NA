package tech.argyll.video.datafeed.tasks;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import javax.inject.Singleton;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Singleton
public class TaskQueue {

  private static final int FULL_SYNC_CONCURRENT = 4;

  @Getter
  private ExecutorService eventsSyncExecutor;

  public TaskQueue() {
    log.info("Initialize TaskQueue");
    if (eventsSyncExecutor == null) {
      log.info("Creating eventsSyncScheduler");
      eventsSyncExecutor = prepareExecutor("events-sync", FULL_SYNC_CONCURRENT);
    }
  }

  private ExecutorService prepareExecutor(String name, int size) {
    final BlockingQueue<Runnable> queue = new ArrayBlockingQueue<>(size * 3);

    final ThreadFactory threadFactory =
        new ThreadFactoryBuilder().setNameFormat(name + "-%d").setDaemon(true).build();

    return new ThreadPoolExecutor(size, size, 0L, TimeUnit.MILLISECONDS, queue, threadFactory);
  }
}
