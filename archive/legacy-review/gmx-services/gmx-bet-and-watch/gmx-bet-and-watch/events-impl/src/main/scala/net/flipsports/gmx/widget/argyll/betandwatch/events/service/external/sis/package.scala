package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external

import pureconfig.generic.ProductHint
import pureconfig.generic.semiauto.deriveReader
import pureconfig.{CamelCase, ConfigFieldMapping, ConfigReader, SnakeCase}

package object sis {

  protected implicit def hint[T] = ProductHint[T](ConfigFieldMapping(CamelCase, SnakeCase))

  implicit val StreamAPIConfigReader: ConfigReader[StreamAPIConfig] = deriveReader[StreamAPIConfig]

}
