package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external

import pureconfig.generic.ProductHint
import pureconfig.generic.semiauto.deriveReader
import pureconfig.{CamelCase, ConfigFieldMapping, ConfigReader, KebabCase}

package object rmg {

  protected implicit def hint[T] = ProductHint[T](ConfigFieldMapping(CamelCase, KebabCase))

  implicit val ContentScoreboardConfigReader: ConfigReader[ContentScoreboardConfig] = deriveReader[ContentScoreboardConfig]


}
