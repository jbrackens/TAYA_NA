package phoenix

import java.nio.file.{ Path, Paths }

import com.typesafe.config.{ Config, ConfigFactory }

import scala.io.Source

trait ConfigSupport {

  def loadConfig(configLocation: String): Config = {
    val path = Paths.get(configLocation)
    val configString = Source.fromFile(path.toFile).getLines().mkString("\n")
    ConfigFactory.parseString(configString)
  }
}
