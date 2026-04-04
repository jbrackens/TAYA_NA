package phoenix.http.core

import java.security.SecureRandom
import java.security.cert.X509Certificate

import scala.concurrent.Future

import akka.actor.ActorSystem
import akka.http.scaladsl.ConnectionContext
import akka.http.scaladsl.Http
import akka.http.scaladsl.HttpExt
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.HttpResponse
import javax.net.ssl.KeyManager
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLEngine
import javax.net.ssl.X509TrustManager

import phoenix.http.core.AkkaHttpClient.insecureConnectionContext

trait HttpClient {
  def sendRequest(httpRequest: HttpRequest, unsafeBypassTLS: Boolean = false): Future[HttpResponse]
}

final class AkkaHttpClient(system: ActorSystem) extends HttpClient {

  private val http: HttpExt = Http()(system)

  override def sendRequest(httpRequest: HttpRequest, unsafeBypassTLS: Boolean = false): Future[HttpResponse] =
    if (unsafeBypassTLS) {
      http.singleRequest(httpRequest, connectionContext = insecureConnectionContext)
    } else {
      http.singleRequest(httpRequest)
    }

  def shutDown(): Future[Unit] =
    http.shutdownAllConnectionPools()
}

object AkkaHttpClient {

  val insecureConnectionContext = ConnectionContext.httpsClient(createInsecureSslEngine _)

  def createInsecureSslEngine(host: String, port: Int): SSLEngine = {
    val engine = trustfulSslContext.createSSLEngine(host, port)
    engine.setUseClientMode(true)
    engine
  }

  private val trustfulSslContext: SSLContext = {
    object NoCheckX509TrustManager extends X509TrustManager {
      override def checkClientTrusted(chain: Array[X509Certificate], authType: String): Unit = ()
      override def checkServerTrusted(chain: Array[X509Certificate], authType: String): Unit = ()
      override def getAcceptedIssuers: Array[X509Certificate] = Array[X509Certificate]()
    }

    val context = SSLContext.getInstance("TLS")
    context.init(Array[KeyManager](), Array(NoCheckX509TrustManager), new SecureRandom())
    context
  }
}
