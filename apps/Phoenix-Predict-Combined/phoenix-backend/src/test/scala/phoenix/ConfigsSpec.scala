package phoenix

import scala.jdk.CollectionConverters._

import com.typesafe.config.ConfigFactory
import org.reflections.Reflections
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.ScalaObjectUtils._
import phoenix.core.config.BaseConfig

final class ConfigsSpec extends AnyWordSpecLike with Matchers {

  "Configs" should {
    "load correctly using *.conf files from classpath" in {

      val configObjectClasses =
        new Reflections("phoenix").getSubTypesOf(classOf[BaseConfig[_]]).asScala

      val config = ConfigFactory.load()

      configObjectClasses.foreach { objectClass =>
        val objectSingleton = objectClass.objectSingletonInstance
        try {
          objectSingleton.apply(config)
        } catch {
          case e: Throwable =>
            fail(
              s"Cannot construct a ${objectClass.getEnclosingClass.getName} instance " +
              s"from *.conf files available on test classpath - this will likely fail in the runtime:\n${e.getMessage}")
          // We apparently can't pass `e` as the second argument to `fail` due to https://github.com/lightbend/config/issues/288

        }
      }
    }
  }
}
