package tech.argyll.video.datafeed.oddsfeed.markettypes;

import static java.util.function.Function.identity;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.extern.slf4j.Slf4j;
import tech.argyll.video.core.sbtech.SBTechMarketType;
import tech.argyll.video.datafeed.oddsfeed.markettypes.model.MarketTypeDict;

@Slf4j
public class MarketTypeCheck {
  public void execute(List<MarketTypeDict> marketTypes) {
    Map<Long, MarketTypeDict> id2type =
        marketTypes.stream().collect(Collectors.toMap(MarketTypeDict::getMarketTypeID, identity()));

    Stream.of(SBTechMarketType.values())
        .filter(sbTechMarketType -> configurationExists(id2type, sbTechMarketType))
        .filter(
            sbTechMarketType -> {
              MarketTypeDict config = id2type.get(sbTechMarketType.getSbtechId());
              return sbTechMarketType.getEventType().getSbtechId() != config.getEventTypeID()
                  || sbTechMarketType.getEventType().isQa() != config.isQA()
                  || sbTechMarketType.getLineType().getSbtechId() != config.getLineTypeID();
            })
        .findAny()
        .ifPresent(
            sbTechMarketType -> {
              throw new IllegalStateException(
                  String.format(
                      "Internal mapping does not match for market type '%s'", sbTechMarketType));
            });
  }

  private boolean configurationExists(
      Map<Long, MarketTypeDict> id2type, SBTechMarketType sbTechMarketType) {
    if (!id2type.containsKey(sbTechMarketType.getSbtechId())) {
      log.warn("No SBTech config for market type '{}'", sbTechMarketType);
      return false;
    } else {
      return true;
    }
  }
}
