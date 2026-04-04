package net.flipsports.gmx.widget.argyll.betandwatch.webgateway.events

import net.flipsports.gmx.widget.argyll.betandwatch.events.api.VideoService

trait BrandBackend extends VideoService {
  def backendId: String
  def supports(partner: String): Boolean
}
