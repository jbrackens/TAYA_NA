package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.rmg

import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException

import scala.concurrent.Future
import scala.xml.Elem

trait ContentScoreboardClient {

  @throws(classOf[ExternalCallException])
  def callEventList(): Future[Elem]

  @throws(classOf[ExternalCallException])
  def callAddUser(providerEventId: String, userId: String, partner: String): Future[Boolean]

  def buildIframeUrl(providerEventId: String, userId: String, partner: String): String
}
