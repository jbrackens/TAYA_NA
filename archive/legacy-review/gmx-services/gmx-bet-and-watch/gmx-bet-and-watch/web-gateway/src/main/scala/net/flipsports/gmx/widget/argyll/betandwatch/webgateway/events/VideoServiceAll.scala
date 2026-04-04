package net.flipsports.gmx.widget.argyll.betandwatch.webgateway.events

trait VideoServiceAll extends BrandBackend {

  override val backendId: String = defaultBackendId

  override def supports(partner: String): Boolean = true
}
