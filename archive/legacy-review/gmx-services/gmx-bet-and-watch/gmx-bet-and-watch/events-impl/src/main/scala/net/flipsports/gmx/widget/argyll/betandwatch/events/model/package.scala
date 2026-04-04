package net.flipsports.gmx.widget.argyll.betandwatch.events

import net.flipsports.gmx.common.internal.partner.commons.cons.SportType

package object model {

  val NOT_AVAILABLE = "N/A"

  def fabricateTestEvent(from: ProviderEvent): PageEvent =
    PageEvent(from.id.toLong, SportType.HORSE_RACING, "TEST", from.startTime, from.description, NOT_AVAILABLE)

  def fabricateFullDayEvent(from: ProviderEvent): PageEvent =
    PageEvent(-1, SportType.HORSE_RACING, "FULL_DAY", from.startTime, from.description, NOT_AVAILABLE)

}
