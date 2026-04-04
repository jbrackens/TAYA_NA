package phoenix.jwt

import java.io.{ FileInputStream, InputStream }

import org.keycloak.adapters.KeycloakDeploymentBuilder
import org.keycloak.representations.adapters.config.AdapterConfig

trait KeycloakInstallation {
  def realm: String
  def authServerUrl: String
  def clientId: String
  def clientSecret: String
}

class KeycloakInstallationAdaptor(adapterConfig: AdapterConfig) extends KeycloakInstallation {
  override def realm: String = adapterConfig.getRealm
  override def authServerUrl: String = adapterConfig.getAuthServerUrl
  override def clientId: String = adapterConfig.getResource
  override def clientSecret: String = adapterConfig.getCredentials.get("secret").toString
}

object KeycloakInstallation {

  def load(location: String): KeycloakInstallation = {
    val adapterConfig = createAdaptorConfig(location)
    new KeycloakInstallationAdaptor(adapterConfig)
  }

  private def createAdaptorConfig(location: String): AdapterConfig = {
    val is: InputStream = new FileInputStream(location)
    KeycloakDeploymentBuilder.loadAdapterConfig(is)
  }
}
