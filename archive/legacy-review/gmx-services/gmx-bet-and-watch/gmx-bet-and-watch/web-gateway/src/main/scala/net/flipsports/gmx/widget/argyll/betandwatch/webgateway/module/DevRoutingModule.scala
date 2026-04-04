package net.flipsports.gmx.widget.argyll.betandwatch.webgateway.module

import com.lightbend.lagom.scaladsl.client.ServiceClient
import com.softwaremill.macwire.wire
import net.flipsports.gmx.widget.argyll.betandwatch.webgateway.events.{BrandBackend, VideoServiceAll, VideoServiceRouter}

trait DevRoutingModule extends BaseModule {

  def serviceClient: ServiceClient

  // remote services
  lazy val backends: Seq[BrandBackend] = Seq(serviceClient.implement[VideoServiceAll])
  lazy val serviceRouter = wire[VideoServiceRouter]

}
