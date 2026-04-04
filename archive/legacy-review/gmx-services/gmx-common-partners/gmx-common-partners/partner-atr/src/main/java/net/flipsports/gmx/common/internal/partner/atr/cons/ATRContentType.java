package net.flipsports.gmx.common.internal.partner.atr.cons;

import net.flipsports.gmx.common.internal.partner.commons.cons.ConsMapping;
import net.flipsports.gmx.common.internal.partner.commons.cons.SportType;

public enum ATRContentType {

  AT_THE_RACES_HORSE(1, SportType.HORSE_RACING),

  AUSTRALIAN_AND_NEW_ZEALAND_HORSE(1001, SportType.HORSE_RACING),

  SOUTH_AFRICAN_HORSE(1003, SportType.HORSE_RACING),

  UNITED_STATES_HORSE(1009, SportType.HORSE_RACING),

  FRANCE_HORSE(1013, SportType.HORSE_RACING),

  TEST_EVENTS(1111, SportType.HORSE_RACING),

  AUSTRALIAN_AND_NEW_ZEALAND_GREYHOUND(1202, SportType.GREYHOUNDS),

  BAGS_GREYHOUND(1203, SportType.GREYHOUNDS),

  UNITED_STATES_GREYHOUND(1206, SportType.GREYHOUNDS);


  private final long atrId;
  private final SportType sportType;

  ATRContentType(long atrId, SportType sportType) {
    this.atrId = atrId;
    this.sportType = sportType;
  }

  public long getAtrId() {
    return atrId;
  }

  public SportType getSportType() {
    return sportType;
  }

  public static final ConsMapping<Long, ATRContentType> MAPPING =
      new ConsMapping<>(ATRContentType.values(), ATRContentType::getAtrId);

}
