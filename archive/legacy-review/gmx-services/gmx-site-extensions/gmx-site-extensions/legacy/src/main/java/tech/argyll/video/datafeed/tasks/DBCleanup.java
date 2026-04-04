package tech.argyll.video.datafeed.tasks;

import io.ebean.ExpressionList;
import io.ebean.Finder;
import java.time.ZonedDateTime;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import tech.argyll.video.common.LoggerUtils;
import tech.argyll.video.domain.model.BaseModel;
import tech.argyll.video.domain.model.EntityStatus;
import tech.argyll.video.domain.model.EventModel;
import tech.argyll.video.domain.model.MarketModel;
import tech.argyll.video.domain.model.SelectionModel;

@Slf4j
public class DBCleanup extends AbstractScheduledJob<Void> {

  @Override
  public Logger logger() {
    return log;
  }

  public Void doExecute() {
    ZonedDateTime now = ZonedDateTime.now();

    purgeTable(SelectionModel.class, now.minusDays(5));
    purgeTable(MarketModel.class, now.minusDays(6));
    purgeTable(EventModel.class, now.minusDays(7));
    return null;
  }

  private <T extends BaseModel> void purgeTable(Class<T> clazz, ZonedDateTime earlierThan) {
    Finder<String, T> finder = new Finder<>(clazz);
    String type = clazz.getSimpleName();

    int before = finder.query().findCount();

    ExpressionList<T> deleteQuery = finder.query().where()
        .eq("processingInfo.status", EntityStatus.DELETED)
        .le("updatedAt", earlierThan);
    int removed = deleteQuery.delete();

    int after = finder.query().findCount();
    log.info("Purged DB for entity {}, retained {} [before: {}, removed: {}]", type, LoggerUtils.kvCount((long) after), before, removed);
  }
}
