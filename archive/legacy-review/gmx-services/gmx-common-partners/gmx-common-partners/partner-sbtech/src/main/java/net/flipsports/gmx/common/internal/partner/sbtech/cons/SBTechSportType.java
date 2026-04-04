package net.flipsports.gmx.common.internal.partner.sbtech.cons;

import net.flipsports.gmx.common.internal.partner.commons.cons.ConsMapping;
import net.flipsports.gmx.common.internal.partner.commons.cons.SportType;

public enum SBTechSportType {
  SOCCER(1L, SportType.SOCCER),

  FOOTBALL(3L, SportType.FOOTBALL),

  HORSE_RACING(61L, SportType.HORSE_RACING),

  GREYHOUNDS(66L, SportType.GREYHOUNDS),

  ENHANCED_ODDS(79L, SportType.ENHANCED_ODDS);

  private final long sbtechId;
  private final SportType sportType;

  SBTechSportType(long sbtechId, SportType sportType) {
    this.sbtechId = sbtechId;
    this.sportType = sportType;
  }

  public long getSbtechId() {
    return sbtechId;
  }

  public SportType getSportType() {
    return sportType;
  }

  public static final ConsMapping<Long, SBTechSportType> MAPPING =
      new ConsMapping<>(SBTechSportType.values(), SBTechSportType::getSbtechId);

}
