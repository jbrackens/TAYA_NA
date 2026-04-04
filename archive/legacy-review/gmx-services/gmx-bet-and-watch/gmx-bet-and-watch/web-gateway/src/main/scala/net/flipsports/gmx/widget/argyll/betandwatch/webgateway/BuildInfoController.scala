package net.flipsports.gmx.widget.argyll.betandwatch.webgateway

import net.flipsports.gmx.widget.argyll.betandwatch.webgateway.info.BuildInfo
import play.api.mvc.{AbstractController, Action, AnyContent, ControllerComponents}

class BuildInfoController(controllerComponents: ControllerComponents)
  extends AbstractController(controllerComponents) {

  def getBuildInfo(): Action[AnyContent] = {
    Action {
      Ok(BuildInfo.toJson).as(JSON)
    }
  }
}
