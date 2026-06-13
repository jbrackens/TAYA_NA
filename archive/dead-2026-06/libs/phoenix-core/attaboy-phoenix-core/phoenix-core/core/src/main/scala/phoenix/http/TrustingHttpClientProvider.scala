package phoenix.http

import org.apache.http.client.HttpClient
import org.apache.http.conn.ssl.{ NoopHostnameVerifier, SSLConnectionSocketFactory, TrustSelfSignedStrategy }
import org.apache.http.impl.client.HttpClients
import org.apache.http.ssl.SSLContextBuilder
import org.slf4j.LoggerFactory

trait TrustingHttpClientProvider {

  val log = LoggerFactory.getLogger(classOf[TrustingHttpClientProvider])

  // use the TrustSelfSignedStrategy to allow Self Signed Certificates
  val sslContext = SSLContextBuilder.create().loadTrustMaterial(new TrustSelfSignedStrategy()).build();

  val httpClient: HttpClient = {

    // we can optionally disable hostname verification.
    // if you don't want to further weaken the security, you don't have to include this.
    val allowAllHosts = new NoopHostnameVerifier();

    // create an SSL Socket Factory to use the SSLContext with the trust self signed certificate strategy
    // and allow all hosts verifier.
    val connectionFactory = new SSLConnectionSocketFactory(sslContext, allowAllHosts);

    // finally create the HttpClient using HttpClient factory methods and assign the ssl socket factory
    HttpClients.custom().setSSLSocketFactory(connectionFactory).build();
  }
}
