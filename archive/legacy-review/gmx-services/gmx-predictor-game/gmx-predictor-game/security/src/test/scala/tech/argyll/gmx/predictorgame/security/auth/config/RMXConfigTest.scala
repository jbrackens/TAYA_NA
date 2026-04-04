package tech.argyll.gmx.predictorgame.security.auth.config

import com.typesafe.config.{ConfigException, ConfigFactory}
import org.junit.runner.RunWith
import org.scalatest.FunSuite
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner

@RunWith(classOf[JUnitRunner])
class RMXConfigTest extends FunSuite {


  test("'load()' should fail when no parameters provided") {
    // given

    // when
    intercept[ConfigException] {
      RMXConfig(ConfigFactory.load())
    }

    // then
  }

  test("'load()' should succeed with provided parameters") {
    // given
    System.setProperty("RMX_CLIENT_ID", "1234")
    System.setProperty("RMX_CLIENT_PASSWORD", "asd!@#")
    System.setProperty("RMX_USER", "some_user")
    System.setProperty("RMX_PASSWORD", "p455w0rd")
    ConfigFactory.invalidateCaches()

    // when
    val actual = RMXConfig(ConfigFactory.load())

    // then
    actual.url should be("https://api.rewardsmatrix.com")
    actual.clientId should be("1234")
    actual.clientPassword should be("asd!@#")
    actual.userName should be("some_user")
    actual.userPassword should be("p455w0rd")

  }
}
