package net.flipsports.gmx.webapiclient.sbtech.betting

import com.typesafe.config.Config
import pureconfig.generic.ProductHint
import pureconfig.generic.semiauto.deriveReader
import pureconfig.{ CamelCase, ConfigFieldMapping, ConfigReader, SnakeCase }

package object config {
  protected implicit def hint[T] = ProductHint[T](ConfigFieldMapping(CamelCase, SnakeCase))

  private implicit val BettingAPIConfigReader: ConfigReader[BettingAPIConfig] = deriveReader[BettingAPIConfig]

  case class BettingAPIConfig(url: String)

  object BettingAPIConfig {
    def apply(config: Config, path: String = "app.external.sbtech.betting-api"): BettingAPIConfig = {
      pureconfig.loadConfigOrThrow[BettingAPIConfig](config.getConfig(path))
    }
  }

}
