package phoenix.jwt

import java.io.FileInputStream
import java.io.InputStream

import org.keycloak.adapters.KeycloakDeploymentBuilder
import org.keycloak.representations.adapters.config.AdapterConfig

import phoenix.core.StringUtils.StringOps

class KeycloakInstallation(adapterConfig: AdapterConfig) {
  def realm: String = adapterConfig.getRealm
  def authServerUrl: String = adapterConfig.getAuthServerUrl.ensureEndsWith("/")
  def clientId: String = adapterConfig.getResource
  def clientSecret: String = adapterConfig.getCredentials.get("secret").toString
}

object KeycloakInstallation {

  def load(location: String): KeycloakInstallation = {
    val adapterConfig = createAdapterConfig(location)
    new KeycloakInstallation(adapterConfig)
  }

  private def createAdapterConfig(location: String): AdapterConfig = {
    val is: InputStream = new FileInputStream(location)
    KeycloakDeploymentBuilder.loadAdapterConfig(is)
  }
}
