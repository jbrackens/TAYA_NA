package net.flipsports.gmx.widget.argyll.betandwatch.events.service

import scala.concurrent.Future
import scala.concurrent.duration.FiniteDuration

trait ScheduledService {

  def shouldExecute(): Boolean

  def delayedInit(): Boolean

  def scheduleInterval(): FiniteDuration

  def runScheduled(): Future[Unit]

}
