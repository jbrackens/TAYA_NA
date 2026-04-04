package net.flipsports.gmx.game.argyll.racingroulette.webgateway.controller

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.info.BuildInfo
import play.api.mvc.{AbstractController, Action, AnyContent, ControllerComponents}

class BuildInfoController(controllerComponents: ControllerComponents)
  extends AbstractController(controllerComponents) {

  def getBuildInfo(): Action[AnyContent] = {
    Action {
      Ok(BuildInfo.toJson).as(JSON)
    }
  }
}
