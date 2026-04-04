package tech.argyll.video.datafeed;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import tech.argyll.video.core.price.Price;

@Getter
@RequiredArgsConstructor
public enum OddsStyle {
  DECIMAL(Price.Type.DECIMAL),
  AMERICAN(Price.Type.AMERICAN),
  FRACTIONAL(Price.Type.FRACTIONAL);

  private final Price.Type priceType;
}
