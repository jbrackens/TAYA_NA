package net.flipsports.gmx.widget.argyll.betandwatch.webgateway.module

import com.typesafe.config.Config

import scala.concurrent.ExecutionContext

trait BaseModule {
  //concurrent
  implicit def executionContext: ExecutionContext

  //config
  implicit def config: Config
}
