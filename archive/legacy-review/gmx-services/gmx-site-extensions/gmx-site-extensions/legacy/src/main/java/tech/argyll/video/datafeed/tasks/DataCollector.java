package tech.argyll.video.datafeed.tasks;

import java.util.concurrent.RejectedExecutionException;
import javax.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import tech.argyll.video.core.sbtech.SBTechOperatorType;
import tech.argyll.video.datafeed.config.OddsJSONFeedOperationFactory;
import tech.argyll.video.datafeed.oddsfeed.leagues.SyncLeaguesOperation;
import tech.argyll.video.datafeed.oddsfeed.markets.SyncSelectionLineGroupIdOperation;

@Slf4j
public class DataCollector extends AbstractScheduledJob<Void> {

  private final OddsJSONFeedOperationFactory oddsJSONFeedOperationFactory;
  private final TaskQueue taskQueue;
  private final SBTechOperatorType operatorType;

  @Inject
  public DataCollector(
      OddsJSONFeedOperationFactory oddsJSONFeedOperationFactory,
      TaskQueue taskQueue,
      SBTechOperatorType operatorType) {
    this.oddsJSONFeedOperationFactory = oddsJSONFeedOperationFactory;
    this.taskQueue = taskQueue;
    this.operatorType = operatorType;
  }

  @Override
  public Logger logger() {
    return log;
  }

  //TODO (GM-1753): remove Settings table
  public Void doExecute() {
    startFullSynchronization();
    return null;
  }

  private void startFullSynchronization() {
    log.info("Starting FullSynchronization");

    try {
      // TODO (GM-1751): load leagues from SD api?
      taskQueue.getEventsSyncExecutor().execute(createSyncLeaguesOperation(operatorType));

      // TODO (GM-1754): not needed if we move to new betslip function
      taskQueue.getEventsSyncExecutor().execute(createSyncSelectionLineGroupIdOperation(operatorType));
    } catch (RejectedExecutionException e) {
      log.warn(
          "Exceeded maximum number of tasks in queue - check for potential performance issues!", e);
    }
  }

  private SyncLeaguesOperation createSyncLeaguesOperation(SBTechOperatorType operator) {
    try {
      return oddsJSONFeedOperationFactory.createSyncLeaguesOperation(operator);
    } catch (Exception e) {
      log.error("Error preparing operation", e);
      throw e;
    }
  }

  private SyncSelectionLineGroupIdOperation createSyncSelectionLineGroupIdOperation(SBTechOperatorType operator) {
    try {
      return oddsJSONFeedOperationFactory.createSyncSelectionLineGroupIdOperation(operator);
    } catch (Exception e) {
      log.error("Error preparing operation", e);
      throw e;
    }
  }
}
