package phoenix.jwt

import java.io.InputStream
import java.util.concurrent.Callable

import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.databind.ObjectMapper
import org.keycloak.adapters.authentication.ClientCredentialsProviderUtils
import org.keycloak.adapters.authorization.PolicyEnforcer
import org.keycloak.adapters.rotation.{ HardcodedPublicKeyLocator, JWKPublicKeyLocator }
import org.keycloak.adapters.{ KeycloakDeployment, KeycloakDeploymentBuilder }
import org.keycloak.common.enums.SslRequired
import org.keycloak.common.util.PemUtils
import org.keycloak.enums.TokenStore
import org.keycloak.representations.adapters.config.AdapterConfig
import org.keycloak.util.SystemPropertiesJsonParserFactory
import org.slf4j.LoggerFactory
import phoenix.http.TrustingHttpClientProvider

/**
 * This is a horrible hack just to be able to set a custom HttpClient
 */
object CustomKeycloakDeploymentBuilder {

  def build(is: InputStream): KeycloakDeployment = {
    val adapterConfig = loadAdapterConfig(is)
    new CustomKeycloakDeploymentBuilder().internalBuild(adapterConfig)
  }

  def loadAdapterConfig(is: InputStream): AdapterConfig = {
    val mapper = new ObjectMapper(new SystemPropertiesJsonParserFactory)
    mapper.setSerializationInclusion(JsonInclude.Include.NON_DEFAULT)
    mapper.readValue(is, classOf[AdapterConfig])
  }
}

class CustomKeycloakDeploymentBuilder extends KeycloakDeploymentBuilder with TrustingHttpClientProvider {

  val logger = LoggerFactory.getLogger(classOf[CustomKeycloakDeploymentBuilder])

  override def internalBuild(adapterConfig: AdapterConfig): KeycloakDeployment = {
    if (adapterConfig.getRealm == null) throw new RuntimeException("Must set 'realm' in config")
    deployment.setRealm(adapterConfig.getRealm)
    val resource = adapterConfig.getResource
    if (resource == null) throw new RuntimeException("Must set 'resource' in config")
    deployment.setResourceName(resource)
    val realmKeyPem = adapterConfig.getRealmKey
    if (realmKeyPem != null) {
      val realmKey = PemUtils.decodePublicKey(realmKeyPem)
      val pkLocator = new HardcodedPublicKeyLocator(realmKey)
      deployment.setPublicKeyLocator(pkLocator)
    } else {
      val pkLocator = new JWKPublicKeyLocator
      deployment.setPublicKeyLocator(pkLocator)
    }
    if (adapterConfig.getSslRequired != null)
      deployment.setSslRequired(SslRequired.valueOf(adapterConfig.getSslRequired.toUpperCase))
    else deployment.setSslRequired(SslRequired.EXTERNAL)
    if (adapterConfig.getConfidentialPort != -1) deployment.setConfidentialPort(adapterConfig.getConfidentialPort)
    if (adapterConfig.getTokenStore != null)
      deployment.setTokenStore(TokenStore.valueOf(adapterConfig.getTokenStore.toUpperCase))
    else deployment.setTokenStore(TokenStore.SESSION)
    if (adapterConfig.getTokenCookiePath != null) deployment.setAdapterStateCookiePath(adapterConfig.getTokenCookiePath)
    if (adapterConfig.getPrincipalAttribute != null)
      deployment.setPrincipalAttribute(adapterConfig.getPrincipalAttribute)
    deployment.setResourceCredentials(adapterConfig.getCredentials)
    deployment.setClientAuthenticator(ClientCredentialsProviderUtils.bootstrapClientAuthenticator(deployment))
    deployment.setPublicClient(adapterConfig.isPublicClient)
    deployment.setUseResourceRoleMappings(adapterConfig.isUseResourceRoleMappings)
    deployment.setExposeToken(adapterConfig.isExposeToken)
    if (adapterConfig.isCors) {
      deployment.setCors(true)
      deployment.setCorsMaxAge(adapterConfig.getCorsMaxAge)
      deployment.setCorsAllowedHeaders(adapterConfig.getCorsAllowedHeaders)
      deployment.setCorsAllowedMethods(adapterConfig.getCorsAllowedMethods)
      deployment.setCorsExposedHeaders(adapterConfig.getCorsExposedHeaders)
    }
    // https://tools.ietf.org/html/rfc7636
    if (adapterConfig.isPkce) deployment.setPkce(true)
    deployment.setBearerOnly(adapterConfig.isBearerOnly)
    deployment.setAutodetectBearerOnly(adapterConfig.isAutodetectBearerOnly)
    deployment.setEnableBasicAuth(adapterConfig.isEnableBasicAuth)
    deployment.setAlwaysRefreshToken(adapterConfig.isAlwaysRefreshToken)
    deployment.setRegisterNodeAtStartup(adapterConfig.isRegisterNodeAtStartup)
    deployment.setRegisterNodePeriod(adapterConfig.getRegisterNodePeriod)
    deployment.setTokenMinimumTimeToLive(adapterConfig.getTokenMinimumTimeToLive)
    deployment.setMinTimeBetweenJwksRequests(adapterConfig.getMinTimeBetweenJwksRequests)
    deployment.setPublicKeyCacheTtl(adapterConfig.getPublicKeyCacheTtl)
    deployment.setIgnoreOAuthQueryParameter(adapterConfig.isIgnoreOAuthQueryParameter)
    deployment.setRewriteRedirectRules(adapterConfig.getRedirectRewriteRules)
    deployment.setVerifyTokenAudience(adapterConfig.isVerifyTokenAudience)
    if (realmKeyPem == null && adapterConfig.isBearerOnly && adapterConfig.getAuthServerUrl == null)
      throw new IllegalArgumentException("For bearer auth, you must set the realm-public-key or auth-server-url")
    if (adapterConfig.getAuthServerUrl == null && (!deployment.isBearerOnly || realmKeyPem == null))
      throw new RuntimeException("You must specify auth-server-url")

    deployment.setAuthServerBaseUrl(adapterConfig)
    if (adapterConfig.getTurnOffChangeSessionIdOnLogin != null)
      deployment.setTurnOffChangeSessionIdOnLogin(adapterConfig.getTurnOffChangeSessionIdOnLogin)
    val policyEnforcerConfig = adapterConfig.getPolicyEnforcerConfig
    if (policyEnforcerConfig != null) deployment.setPolicyEnforcer(new Callable[PolicyEnforcer]() {
      override def call: PolicyEnforcer = {
        new PolicyEnforcer(deployment, adapterConfig)
      }
    })

    // All of that just for this line!!!
    deployment.setClient(httpClient)

    deployment
  }
}
