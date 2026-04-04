package net.flipsports.gmx.common.internal.partner.atr.league;

import net.flipsports.gmx.common.internal.partner.commons.league.LeaguesCorrector;

public class ATRLeaguesCorrector extends LeaguesCorrector {

  @Override
  protected void initCorrections() {
    addCorrection("Evangeline", "Evangeline Downs");
    addCorrection("Remington", "Remington Park");
    addCorrection("Tampa Bay", "Tampa Bay Downs");

    addCorrection("Le Lion dAnger", "Le Lion D'angers");
    addCorrection("ParisLongchamp", "Longchamp");
  }
}
