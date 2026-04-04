package net.flipsports.gmx.widget.argyll.betandwatch.webgateway

import java.util.UUID

import play.api.mvc._

abstract class AbstractBWController(controllerComponents: ControllerComponents)
  extends AbstractController(controllerComponents) {

  protected def withUser[T](block: Option[UUID] => T)(implicit rh: RequestHeader): T = {
    block(rh.session.get("user").map(UUID.fromString))
  }
}
