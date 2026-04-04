package phoenix.support
import com.github.tomakehurst.wiremock.WireMockServer
import com.github.tomakehurst.wiremock.client.WireMock
import com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig
import org.scalatest.BeforeAndAfterAll
import org.scalatest.BeforeAndAfterEach
import org.scalatest.TestSuite

trait HttpSpec extends TestSuite with BeforeAndAfterAll with BeforeAndAfterEach {

  protected lazy val httpHost = "localhost"
  protected lazy val httpBaseUrl = s"http://$httpHost:$httpPort"
  protected lazy val httpServer = new WireMockServer(wireMockConfig().dynamicPort())
  protected def httpPort = httpServer.port()

  override protected def beforeAll(): Unit = {
    httpServer.start()
    WireMock.configureFor(httpHost, httpPort)
    super.beforeAll()
  }

  override protected def afterAll(): Unit = {
    super.afterAll()
    httpServer.stop()
  }

  override def afterEach(): Unit = {
    httpServer.resetAll()
  }
}
