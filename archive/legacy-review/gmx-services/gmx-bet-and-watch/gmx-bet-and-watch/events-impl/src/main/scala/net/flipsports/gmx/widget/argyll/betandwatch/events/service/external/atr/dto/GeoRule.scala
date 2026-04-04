package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto

import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto.GeoRuleType.GeoRuleType

case class GeoRule(ruleType: GeoRuleType, countries: Seq[String])