package phoenix.core.config

import scala.reflect.ClassTag

import akka.actor.typed.ActorSystem
import pureconfig.ConfigObjectSource
import pureconfig.ConfigReader
import pureconfig.ConfigSource

/**
 * To check config correctness smoothly in tests (see `phoenix.ConfigsSpec`),
 * we need to pass `classTag` and `reader` as arguments to the constructor (rather than to `apply` methods).
 * If it wasn't for this requirement, implicit params could be passed to methods, and BaseConfig could be extended as:
 *
 * {{{
 *   final case class FooConfig(someValue: String)
 *
 *   object FooConfig extends BaseConfig[FooConfig]("phoenix.foo")
 * }}}
 *
 * but unfortunately, with params passed to the constructor, the above would end up with
 * `super constructor cannot be passed a self reference unless parameter is declared by-name` compiler error.
 *
 * To circumvent this issue, the object extending `BaseConfig` should be a different one than the `FooConfig` companion:
 *
 * {{{
 *   final case class FooConfig(someValue: String)
 *
 *   object FooConfig {
 *     object of extends BaseConfig[FooConfig]("phoenix.foo")
 *   }
 * }}}
 *
 * and than the config can be created with `FooConfig.of(actorSystem)`.
 */
abstract class BaseConfig[A](pathRoot: String)(implicit classTag: ClassTag[A], reader: ConfigReader[A]) {

  def apply(system: ActorSystem[Nothing]): A =
    apply(system.settings.config)

  def apply(config: com.typesafe.config.Config): A =
    apply(ConfigSource.fromConfig(config))

  def apply(config: String): A =
    apply(ConfigSource.string(config))

  private def apply(config: ConfigObjectSource): A =
    config.at(pathRoot).loadOrThrow[A]
}
