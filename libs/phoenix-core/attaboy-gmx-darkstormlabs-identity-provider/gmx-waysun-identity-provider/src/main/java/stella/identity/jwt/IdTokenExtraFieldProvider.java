package stella.identity.jwt;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.jboss.logging.Logger;

import org.keycloak.models.ClientSessionContext;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.ProtocolMapperModel;
import org.keycloak.models.RoleModel;
import org.keycloak.models.UserSessionModel;
import org.keycloak.protocol.oidc.mappers.AbstractOIDCProtocolMapper;
import org.keycloak.protocol.oidc.mappers.OIDCAttributeMapperHelper;
import org.keycloak.protocol.oidc.mappers.OIDCIDTokenMapper;
import org.keycloak.provider.ProviderConfigProperty;
import org.keycloak.representations.IDToken;

import stella.identity.crypt.SecretBoxUtils;
import stella.identity.jpa.ClientProjectDTO;
import stella.identity.spi.ProjectService;
import stella.identity.spi.StellaSecretBoxService;

public class IdTokenExtraFieldProvider extends AbstractOIDCProtocolMapper implements OIDCIDTokenMapper {

  private static final Logger logger = Logger.getLogger(IdTokenExtraFieldProvider.class);

  private static final List<ProviderConfigProperty> configProperties = new ArrayList<>();

  public static final String PROVIDER_ID = "stella-jwt-extra-field-provider";

  private static final String EXTRA_CLAIM_NAME = "extra";

  static {
    // Used in the mapper configuration dialog box
    OIDCAttributeMapperHelper.addIncludeInTokensConfig(configProperties, IdTokenExtraFieldProvider.class);
  }

  @Override
  public String getDisplayCategory() {
    return TOKEN_MAPPER_CATEGORY;
  }

  @Override
  public String getDisplayType() {
    return "Stella `Extra` Field Provider";
  }

  @Override
  public String getHelpText() {
    return "Adds to ID Token 'extra' claim containing an encrypted secret box with permissions and IDs of projects";
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
    ProjectService projectService = keycloakSession.getProvider(ProjectService.class);
    String clientId = clientSessionCtx.getClientSession().getClient().getClientId();

    Set<String> clientRoles = clientSessionCtx.getRolesStream().map(RoleModel::getName).collect(Collectors.toSet());

    try {
      Map<Boolean, List<ClientProjectDTO>> allProjectMappings = projectService.findAllProjectsByClientId(clientId)
          .stream().collect(Collectors.partitioningBy(cp -> cp.getClientProject().isPrimary()));

      String currentPrimaryProjectPublicId = allProjectMappings.get(true).get(0).getProject().getProjectPublicId().toString();
      Set<String> currentAdditionalProjectPublicIds = allProjectMappings.get(false).stream()
          .map(cp -> cp.getProject().getProjectPublicId().toString()).collect(Collectors.toSet());
      JwtExtraField extra = new JwtExtraField(clientRoles, currentPrimaryProjectPublicId, currentAdditionalProjectPublicIds);
      String secretBoxContent = keycloakSession.getProvider(StellaSecretBoxService.class).encrypt(extra);

      logger.debugv("{0} claim set to {1} when preparing ID Token for user {2} with id {3} of client {4} in realm {5}",
          EXTRA_CLAIM_NAME, secretBoxContent, userSession.getUser().getUsername(), userSession.getUser().getId(), clientId,
          userSession.getRealm().getName());
      token.setOtherClaims(EXTRA_CLAIM_NAME, secretBoxContent);
    } catch (SecretBoxUtils.SecretBoxEncryptionException e) {
      logger.errorv(
          "Could not encrypt secret box when preparing ID Token for user {0} with id {1} of client {2} in realm {3}",
          userSession.getUser().getUsername(), userSession.getUser().getId(), clientId,
          userSession.getRealm().getName());
    } catch (IndexOutOfBoundsException e) {
      logger.warnv(
          "Could not find primary project projectPublicId when preparing ID Token for user {0} with id {1} of client {2} in realm {3}",
          userSession.getUser().getUsername(), userSession.getUser().getId(), clientId,
          userSession.getRealm().getName());
    }
  }

}
