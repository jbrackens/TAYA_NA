package net.flipsports.gmx.game.argyll.racingroulette.webgateway

import com.softwaremill.macwire.wire
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.controller.roulette.{RequestDeserializer, ResponseSerializer}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.controller.{BuildInfoController, OperatorController, RouletteController}
import play.api.mvc.ControllerComponents

trait ControllerModule extends UserModule with EventModule with BaseModule {
  //play
  def controllerComponents: ControllerComponents

  lazy val reqDeserializer: RequestDeserializer = wire[RequestDeserializer]
  lazy val resSerializer: ResponseSerializer = wire[ResponseSerializer]

  lazy val buildInfoController: BuildInfoController = wire[BuildInfoController]
  lazy val rouletteController: RouletteController = wire[RouletteController]
  lazy val operatorController: OperatorController = wire[OperatorController]
}
