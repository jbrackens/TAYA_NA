package stella.identity.jwt;

import java.util.ArrayList;
import java.util.List;

import org.jboss.logging.Logger;

import org.keycloak.models.ClientSessionContext;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.ProtocolMapperModel;
import org.keycloak.models.UserSessionModel;
import org.keycloak.protocol.oidc.mappers.AbstractOIDCProtocolMapper;
import org.keycloak.protocol.oidc.mappers.OIDCAccessTokenMapper;
import org.keycloak.protocol.oidc.mappers.OIDCAttributeMapperHelper;
import org.keycloak.provider.ProviderConfigProperty;
import org.keycloak.representations.IDToken;

/**
 * We want to store the roles in a safe way in a secret box via {@link IdTokenExtraFieldProvider}, but Keycloak still
 * exposes them in non-encrypted form in the access tokens. This protocol mapper replaces values of realm_access and
 * resource_access claims with a dummy value.
 */
public class AccessTokenRoleClaimsRemover extends AbstractOIDCProtocolMapper implements OIDCAccessTokenMapper {

  private static final Logger logger = Logger.getLogger(AccessTokenRoleClaimsRemover.class);

  private static final List<ProviderConfigProperty> configProperties = new ArrayList<>();

  private static final String PROVIDER_ID = "stella-jwt-role-claims-remover";

  private static final String REALM_ACCESS_CLAIM_NAME = "realm_access";

  private static final String RESOURCE_ACCESS_CLAIM_NAME = "resource_access";

  private static final String HIDDEN_VALUE = "value_hidden";

  static {
    // Used in the mapper configuration dialog box
    OIDCAttributeMapperHelper.addIncludeInTokensConfig(configProperties, AccessTokenRoleClaimsRemover.class);
  }

  @Override
  public String getDisplayCategory() {
    return TOKEN_MAPPER_CATEGORY;
  }

  @Override
  public String getDisplayType() {
    return "Stella Role Claims Remover";
  }

  @Override
  public String getHelpText() {
    return "Removes unencrypted *_access claims from Access Token";
  }

  @Override
  public List<ProviderConfigProperty> getConfigProperties() {
    return configProperties;
  }

  @Override
  public String getId() {
    return PROVIDER_ID;
  }

  @Override
  protected void setClaim(IDToken token, ProtocolMapperModel mappingModel, UserSessionModel userSession,
      KeycloakSession keycloakSession, ClientSessionContext clientSessionCtx) {
    logger.debugv("Setting {0} and {1} to {2} when preparing Access Token for user {3} of client {4} in realm {5}",
        REALM_ACCESS_CLAIM_NAME, RESOURCE_ACCESS_CLAIM_NAME, HIDDEN_VALUE, userSession.getUser().getId(),
        clientSessionCtx.getClientSession().getClient().getId(),
        userSession.getRealm().getName());
    // At this point it's not possible to remove claims as they are not yet set,
    // but if we set them explicitly to some value, they won't be overridden
    token.setOtherClaims(REALM_ACCESS_CLAIM_NAME, HIDDEN_VALUE);
    token.setOtherClaims(RESOURCE_ACCESS_CLAIM_NAME, HIDDEN_VALUE);
  }
}
