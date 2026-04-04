package net.flipsports.gmx.widget.argyll.betandwatch.webgateway.module

import com.lightbend.lagom.scaladsl.client.ServiceClient
import com.softwaremill.macwire.wire
import net.flipsports.gmx.widget.argyll.betandwatch.webgateway.events._

trait ProdRoutingModule extends DevRoutingModule {

  def serviceClient: ServiceClient

  // remote services
  override lazy val backends: Seq[BrandBackend] = Seq(serviceClient.implement[VideoServiceSN],
    serviceClient.implement[VideoServiceRZ])
  override lazy val serviceRouter = wire[VideoServiceRouter]

}
