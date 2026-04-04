package stella.common.core.config

import scala.reflect.ClassTag

import com.typesafe.config.Config
import pureconfig.ConfigObjectSource
import pureconfig.ConfigReader
import pureconfig.ConfigSource

abstract class BaseConfig[A](pathRoot: String) {

  // Implicit params need to be declared on methods,
  // rather than on primary constructor, otherwise we'd end up with
  // `super constructor cannot be passed a self reference unless parameter is declared by-name`
  // error on subclass constructors.
  def apply(config: Config)(implicit classTag: ClassTag[A], reader: ConfigReader[A]): A =
    fromConfig(config)

  def fromConfig(config: Config)(implicit classTag: ClassTag[A], reader: ConfigReader[A]): A =
    fromConfigObjectSource(ConfigSource.fromConfig(config))

  def fromString(config: String)(implicit classTag: ClassTag[A], reader: ConfigReader[A]): A =
    fromConfigObjectSource(ConfigSource.string(config))

  private def fromConfigObjectSource(
      config: ConfigObjectSource)(implicit classTag: ClassTag[A], reader: ConfigReader[A]): A =
    config.at(pathRoot).loadOrThrow[A]
}
