package phoenix.keycloak

import scala.jdk.CollectionConverters._

import org.keycloak.authorization.client.AuthzClient
import org.keycloak.authorization.client.Configuration
import org.slf4j.LoggerFactory

import phoenix.http.TrustingHttpClientProvider
import phoenix.jwt.KeycloakInstallation

object AuthzClientHelper extends TrustingHttpClientProvider {

  private val log = LoggerFactory.getLogger(getClass)

  def create(installation: KeycloakInstallation): AuthzClient = {
    val configuration = new Configuration(
      installation.authServerUrl,
      installation.realm,
      installation.clientId,
      Map("secret" -> installation.clientSecret.asInstanceOf[java.lang.Object]).asJava,
      httpClient)
    try {
      AuthzClient.create(configuration)
    } catch {
      case e: RuntimeException =>
        log.error("Failed to create AuthzClient - make sure you are using the latest keycloak.json from 1Pass")
        throw e
    }
  }
}
