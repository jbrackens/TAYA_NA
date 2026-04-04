package stella.common.http.jwt.config

import scala.concurrent.duration.FiniteDuration

final case class JwtConfig(
    requireJwtAuth: Boolean,
    serviceDiscoveryEndpointUri: String, // public URL of the auth service, eg http://public_host/auth/realms. Must be the prefix of "iss" token field
    internalServiceDiscoveryEndpointUri: String, // internal URL of the auth service, eg http://identity-provider.microservices.svc:8000/auth/realms
    issuerCacheRefreshFrequency: FiniteDuration,
    jwksCacheRefreshFrequency: FiniteDuration)
