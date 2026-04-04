package net.flipsports.gmx.common.internal.partner.rmg.league;

import net.flipsports.gmx.common.internal.partner.commons.league.LeaguesCorrector;

public class RMGLeaguesCorrector extends LeaguesCorrector {

  @Override
  protected void initCorrections() {
    addCorrection("Hamilton Park", "Hamilton");
    addCorrection("Haydock Park", "Haydock");
    addCorrection("Kempton Park", "Kempton");
    addCorrection("Sandown Park", "Sandown");

    addCorrection("Gowran Park", "Gowran");

    addCorrection("Ladbrokes Park", "Ladbrokes");
    addCorrection("Morphetteville Park", "Morphetteville");

  }
}
