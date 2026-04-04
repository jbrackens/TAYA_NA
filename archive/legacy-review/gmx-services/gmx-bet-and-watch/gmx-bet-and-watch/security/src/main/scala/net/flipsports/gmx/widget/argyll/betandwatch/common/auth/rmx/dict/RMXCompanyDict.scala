package net.flipsports.gmx.widget.argyll.betandwatch.common.auth.rmx.dict

import net.flipsports.gmx.widget.argyll.betandwatch.common.auth.rmx.RMXConfig

class RMXCompanyDict(config: RMXConfig) {

  def lookupCompanyName(companyId: String): String = companyId match {
    case config.company.sportNation => Brand.sportNation
    case config.company.redZone => Brand.redZone
    case config.company.giveMeBet => Brand.giveMeBet
    case _ => throw new IllegalArgumentException(s"Unsupported company: $companyId")
  }
}
