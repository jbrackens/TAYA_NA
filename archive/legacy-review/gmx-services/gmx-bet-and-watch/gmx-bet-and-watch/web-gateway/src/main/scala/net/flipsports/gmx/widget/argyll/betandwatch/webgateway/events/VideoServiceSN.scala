package net.flipsports.gmx.widget.argyll.betandwatch.webgateway.events

import com.lightbend.lagom.scaladsl.api.Descriptor
import net.flipsports.gmx.widget.argyll.betandwatch.common.auth.rmx.dict.Brand

trait VideoServiceSN extends BrandBackend {

  override val backendId: String = "event-SN"

  override def descriptor: Descriptor = descriptorFor(backendId)

  override def supports(partner: String): Boolean = Brand.sportNation.equals(partner)
}
