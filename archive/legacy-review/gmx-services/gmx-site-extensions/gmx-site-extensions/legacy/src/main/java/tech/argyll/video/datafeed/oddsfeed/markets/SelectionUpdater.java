package tech.argyll.video.datafeed.oddsfeed.markets;

import io.vavr.Tuple;
import io.vavr.Tuple2;
import java.util.List;
import java.util.Objects;
import javax.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import tech.argyll.video.core.sbtech.SBTechOperatorType;
import tech.argyll.video.datafeed.oddsfeed.SelectionUpdaterStats;
import tech.argyll.video.datafeed.oddsfeed.markets.model.Line;
import tech.argyll.video.datafeed.oddsfeed.markets.model.Sport;
import tech.argyll.video.domain.SelectionDao;
import tech.argyll.video.domain.model.PartnerType;
import tech.argyll.video.domain.model.SelectionModel;

@Slf4j
public class SelectionUpdater {

  private final SelectionDao selectionDao;

  @Inject
  public SelectionUpdater(SelectionDao selectionDao) {
    this.selectionDao = selectionDao;
  }

  public SelectionUpdaterStats<String> updateLineGroupId(
      List<Sport> sports, SBTechOperatorType operator) {
    SelectionUpdaterStats<String> stats = new SelectionUpdaterStats<>();
    PartnerType partnerType = operator.getPartnerType();

    sports
        .stream()
        .flatMap(s -> s.getLeagues().stream())
        .flatMap(l -> l.getGames().stream())
        .flatMap(g -> g.getMarkets().stream())
        .flatMap(m -> m.getLines().stream())
        .parallel()
        .filter(line -> isValid(line, stats))
        .map(line -> getLineWithSelection(partnerType, line))
        .filter(lineWithSelection -> isFound(lineWithSelection._1, lineWithSelection._2, stats))
        .filter(lineWithSelection -> isChanged(lineWithSelection._1, lineWithSelection._2, stats))
        .forEach(this::updateLineGroupId);

    log.info("Updated selections '{}'", stats);
    return stats;
  }

  private Tuple2<Line, SelectionModel> getLineWithSelection(PartnerType partnerType, Line line) {
    SelectionModel selection = selectionDao.findByRefIdAndPartner(line.getLineID(), partnerType);
    return Tuple.of(line, selection);
  }

  private void updateLineGroupId(Tuple2<Line, SelectionModel> lineWithSelection) {
    lineWithSelection._2.setGroupId(lineWithSelection._1.getLineGroupID().toString());
    lineWithSelection._2.update();
  }

  private boolean isValid(Line line, SelectionUpdaterStats<String> stats) {
    if (line.getLineGroupID() == null) {
      stats.addInvalidLine(line.getLineID());
      return false;
    } else {
      return true;
    }
  }

  private boolean isFound(
      Line line, SelectionModel selections, SelectionUpdaterStats<String> stats) {
    if (selections == null) {
      stats.addNotFoundLine(line.getLineID());
      return false;
    } else {
      return true;
    }
  }

  private boolean isChanged(
      Line line, SelectionModel selections, SelectionUpdaterStats<String> stats) {
    if (Objects.equals(selections.getGroupId(), line.getLineGroupID().toString())) {
      stats.addUnchangedLine(line.getLineID());
      return false;
    } else {
      stats.addUpdatedLine(line.getLineID());
      return true;
    }
  }
}
