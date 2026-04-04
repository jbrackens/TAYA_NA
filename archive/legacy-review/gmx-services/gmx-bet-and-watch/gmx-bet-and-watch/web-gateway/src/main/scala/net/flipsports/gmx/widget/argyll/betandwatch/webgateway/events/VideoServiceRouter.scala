package net.flipsports.gmx.widget.argyll.betandwatch.webgateway.events

import java.util

import com.typesafe.config.{Config, ConfigValue}
import com.typesafe.scalalogging.LazyLogging

import scala.collection.JavaConverters._

class VideoServiceRouter(supportedBackends: Seq[BrandBackend], config: Config)
  extends LazyLogging {

  private val enabledBackends = checkEnabledBackends()

  def findBackend(partner: Option[String]): BrandBackend = {
    partner.map(p => {
      val foundBackend = findCorrespondingBackend(p)
      validated(foundBackend)
    })
      .getOrElse(defaultBackendForAnonymous)
  }

  private def findCorrespondingBackend(partner: String): BrandBackend = {
    supportedBackends.find(backend => backend.supports(partner))
      .getOrElse(throw new IllegalArgumentException(s"Unsupported backend: $partner"))
  }

  private def validated(backend: BrandBackend): BrandBackend = {
    if (!enabledBackends.contains(backend.backendId))
      throw new IllegalArgumentException(s"Disabled backend: ${backend.backendId}")
    backend
  }

  private def defaultBackendForAnonymous: BrandBackend = {
    supportedBackends.head
  }

  private def checkEnabledBackends(): Set[String] = {
    val backendConfig: util.Set[util.Map.Entry[String, ConfigValue]] = config.getConfig("lagom.services").entrySet()

    backendConfig
      .asScala
      .filter(isConfigured)
      .map(entry => entry.getKey)
      .toSet
  }

  private def isConfigured(configEntry: util.Map.Entry[String, ConfigValue]) = {
    val isConfigured = configEntry.getValue.unwrapped().toString.nonEmpty
    if (!isConfigured) {
      logger.warn(s"BrandBackend ${configEntry.getKey} without URL - DISABLE!")
    }
    isConfigured
  }
}
