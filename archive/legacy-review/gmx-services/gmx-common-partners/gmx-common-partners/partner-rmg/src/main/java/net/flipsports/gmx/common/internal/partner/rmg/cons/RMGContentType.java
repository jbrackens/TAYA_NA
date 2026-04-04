package net.flipsports.gmx.common.internal.partner.rmg.cons;

import net.flipsports.gmx.common.internal.partner.commons.cons.ConsMapping;
import net.flipsports.gmx.common.internal.partner.commons.cons.SportType;

public enum RMGContentType {

  HORSE_RACING(1, SportType.HORSE_RACING);

  private final long rmgId;
  private final SportType sportType;

  RMGContentType(long atrId, SportType sportType) {
    this.rmgId = atrId;
    this.sportType = sportType;
  }

  public long getRmgId() {
    return rmgId;
  }

  public SportType getSportType() {
    return sportType;
  }

  public static final ConsMapping<Long, RMGContentType> MAPPING =
      new ConsMapping<>(RMGContentType.values(), RMGContentType::getRmgId);

}
