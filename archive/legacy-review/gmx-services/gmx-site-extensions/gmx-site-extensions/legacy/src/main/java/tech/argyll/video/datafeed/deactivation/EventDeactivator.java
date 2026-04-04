package tech.argyll.video.datafeed.deactivation;

import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.BiConsumer;
import javax.inject.Inject;
import javax.inject.Singleton;
import lombok.extern.slf4j.Slf4j;
import tech.argyll.video.domain.EventDao;
import tech.argyll.video.domain.Execution;
import tech.argyll.video.domain.model.BaseModel;
import tech.argyll.video.domain.model.EventModel;
import tech.argyll.video.domain.model.MarketModel;
import tech.argyll.video.domain.model.SelectionModel;

@Slf4j
@Singleton
public class EventDeactivator {
  private final EventDao eventDao;

  @Inject
  public EventDeactivator(EventDao eventDao) {
    this.eventDao = eventDao;
  }

  public DeactivationStats activateExecution(Execution execution) {
    List<EventModel> relatedEvents =
        eventDao.queryBySport(execution.getPartner(), execution.getSport());
    DeactivationStats stats = new DeactivationStats();
    process(
        relatedEvents,
        execution.getExecutionId(),
        this::activateEvent,
        this::deactivateEvent,
        stats);
    log.info("Deactivated '{}'", stats);
    return stats;
  }

  private <T extends BaseModel> void process(
      Iterable<T> input,
      String executionId,
      BiConsumer<T, DeactivationStats> activator,
      BiConsumer<T, DeactivationStats> deactivator,
      DeactivationStats stats) {
    input.forEach(
        e -> {
          if (e.getProcessingInfo().isConnected(executionId)) {
            activator.accept(e, stats);
          } else {
            deactivator.accept(e, stats);
          }
        });
  }

  private void activateEvent(EventModel event, DeactivationStats stats) {
    activate(event);
    process(
        event.getMarkets(),
        event.getProcessingInfo().getExecutionId(),
        this::activateMarket,
        this::deactivateMarket,
        stats);
  }

  private void activateMarket(MarketModel market, DeactivationStats stats) {
    activate(market);
    process(
        market.getSelections(),
        market.getProcessingInfo().getExecutionId(),
        this::activateSelection,
        this::deactivateSelection,
        stats);
  }

  private void activateSelection(SelectionModel selection, DeactivationStats stats) {
    activate(selection);
  }

  private void activate(BaseModel model) {
    if (!model.getProcessingInfo().isActive()) {
      model.getProcessingInfo().activate();
      model.update();
    }
  }

  private void deactivateEvent(EventModel event, DeactivationStats stats) {
    deactivate(event, stats);
    event.getMarkets().forEach(m -> deactivateMarket(m, stats));
  }

  private void deactivateMarket(MarketModel market, DeactivationStats stats) {
    deactivate(market, stats);
    market.getSelections().forEach(s -> deactivateSelection(s, stats));
  }

  private void deactivateSelection(SelectionModel selection, DeactivationStats stats) {
    deactivate(selection, stats);
  }

  private void deactivate(BaseModel model, DeactivationStats stats) {
    if (model.getProcessingInfo().isActive()) {
      model.getProcessingInfo().deactivate();
      model.update();
      stats.countDeactivation(model);
    }
  }

  private static class DeactivationStats {
    private Map<String, Integer> type2count = new TreeMap<>();

    void countDeactivation(BaseModel model) {
      String className = model.getClass().getSimpleName();
      type2count.put(className, type2count.getOrDefault(className, 0) + 1);
    }

    @Override
    public String toString() {
      StringBuilder result = new StringBuilder("DeactivationStats [");
      type2count.forEach((key, value) -> result.append(String.format("%s = %s; ", key, value)));
      return result.append("]").toString();
    }
  }
}
