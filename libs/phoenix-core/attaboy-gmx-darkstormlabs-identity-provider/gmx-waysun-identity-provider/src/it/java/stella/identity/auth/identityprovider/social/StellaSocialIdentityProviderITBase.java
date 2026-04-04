package stella.identity.auth.identityprovider.social;

import static javax.ws.rs.core.Response.Status.BAD_REQUEST;
import static javax.ws.rs.core.Response.Status.SEE_OTHER;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static stella.identity.utils.ResponseMatcher.hasStatus;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.shaded.okhttp3.Request;
import org.testcontainers.shaded.okhttp3.Response;

import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.authentication.authenticators.broker.IdpReviewProfileAuthenticatorFactory;
import org.keycloak.authentication.authenticators.browser.SpnegoAuthenticatorFactory;
import org.keycloak.authentication.authenticators.client.ClientIdAndSecretAuthenticator;
import org.keycloak.models.AuthenticationFlowBindings;
import org.keycloak.models.jpa.entities.AuthenticationExecutionEntity;
import org.keycloak.models.jpa.entities.AuthenticatorConfigEntity;
import org.keycloak.models.jpa.entities.RealmEntity;
import org.keycloak.models.utils.KeycloakModelUtils;
import org.keycloak.protocol.oidc.OIDCLoginProtocol;
import org.keycloak.representations.idm.AuthenticationExecutionInfoRepresentation;
import org.keycloak.representations.idm.AuthenticationFlowRepresentation;
import org.keycloak.representations.idm.AuthenticatorConfigRepresentation;
import org.keycloak.representations.idm.ClientRepresentation;
import org.keycloak.representations.idm.IdentityProviderRepresentation;

import stella.identity.auth.authenticator.AlwaysEndSessionAuthenticatorFactory;
import stella.identity.rest.RestResourceTestBase;

public abstract class StellaSocialIdentityProviderITBase extends RestResourceTestBase {

  protected final static String FIRST_BROKER_FLOW_ALIAS = "first broker login";
  protected final static String IDENTITY_PROVIDER_REDIRECTOR_PROVIDER_ID = "identity-provider-redirector";
  protected final static String REQUIREMENT_REQUIRED = "REQUIRED";
  protected final static String PROVIDER_PARAM_NAME = "provider";

  protected RealmResource realm;
  protected final String realmName;
  protected final String identityProviderProviderId;
  protected final String identityProviderAlias;
  protected final String keycloakClientId;
  protected final String newSocialBrowserFlowAlias;

  protected abstract String getSocialProviderClientIdValue();

  protected abstract String getSocialProviderClientSecretValue();

  public StellaSocialIdentityProviderITBase(String realmName, String identityProviderProviderId,
      String identityProviderAlias, String keycloakClientId, String newSocialBrowserFlowAlias) {
    this.realmName = realmName;
    this.identityProviderProviderId = identityProviderProviderId;
    this.identityProviderAlias = identityProviderAlias;
    this.keycloakClientId = keycloakClientId;
    this.newSocialBrowserFlowAlias = newSocialBrowserFlowAlias;
  }

  @BeforeAll
  void before() {
    initialiseRealm();
    confirmFirstBrokerFlowExists();
    adjustFirstBrokerFlow();
    createSocialIdentityProvider();
    String socialBrowserFlowId = createSocialBrowserFlow();
    createSocialLoginClient(socialBrowserFlowId);
  }

  // You can put a breakpoint somewhere in this test if you'd like to verify a whole flow manually
  // using a browser, and you'd like to have a whole env set up properly (assuming
  // getSocialProviderClientIdValue and getSocialProviderClientSecretValue return real values)
  @Test
  void authEndpointShouldRedirectToProviderPage() throws IOException {
    String urlQueryParams = "response_type=code&code_challenge=6mpapBrd9oyy22otLb2G2LMHaSiLEFK7vEoYdW-rSX8&code_challenge_method=S256&client_id="
        + keycloakClientId +
        "&redirect_uri=http%3A%2F%2Flocalhost%3A63343%2Fpython-social-login%2Fsrc%2Freturn.html%3F_ijt%3Dfh25psj0sfv19ckjrk8thuu99o%26_ij_reload%3DRELOAD_ON_SAVE&scope=openid%20email&audience=test_audience&state=49f967fd";
    String url = String.format("%s/auth/realms/%s/protocol/openid-connect/auth?%s", keycloakUrl(), realmName, urlQueryParams);
    Response response = send(new Request.Builder().url(url).get());
    assertThat(response, hasStatus(BAD_REQUEST));
    // we should be redirected to the social provider's page; we're able to check only that there
    // was some redirection
    assertThat(response.priorResponse(), hasStatus(SEE_OTHER));
  }

  private void initialiseRealm() {
    createRealm(realmName);
    realm = keycloakInstanceDefault.realm(realmName);
  }

  private void confirmFirstBrokerFlowExists() {
    assertTrue(
        realm.flows().getFlows().stream()
            .anyMatch((AuthenticationFlowRepresentation f) -> FIRST_BROKER_FLOW_ALIAS.equals(f.getAlias())),
        String.format("%s should be present", FIRST_BROKER_FLOW_ALIAS));
  }

  private void adjustFirstBrokerFlow() {
    List<AuthenticationExecutionInfoRepresentation> executions = getExecutionsForFlow(FIRST_BROKER_FLOW_ALIAS);
    AuthenticationExecutionInfoRepresentation reviewProfileExecution = getExistingExecutionByProviderId(executions,
        IdpReviewProfileAuthenticatorFactory.PROVIDER_ID);
    AuthenticatorConfigRepresentation conf = realm.flows()
        .getAuthenticatorConfig(reviewProfileExecution.getAuthenticationConfig());
    conf.setConfig(Map.of("update.profile.on.first.login", "off"));
    realm.flows().updateAuthenticatorConfig(reviewProfileExecution.getAuthenticationConfig(), conf);
  }

  private void createSocialIdentityProvider() {
    IdentityProviderRepresentation ipr = new IdentityProviderRepresentation();
    ipr.setTrustEmail(true);
    ipr.setProviderId(identityProviderProviderId);
    ipr.setAlias(identityProviderAlias);
    ipr.setFirstBrokerLoginFlowAlias(FIRST_BROKER_FLOW_ALIAS);
    ipr.setConfig(Map.of(
        "clientId", getSocialProviderClientIdValue(),
        "clientSecret", getSocialProviderClientSecretValue(),
        "acceptsPromptNoneForwardFromClient", "true",
        "hideOnLoginPage", "true",
        "syncMode", "IMPORT"));
    realm.identityProviders().create(ipr);
  }

  private String createSocialBrowserFlow() {
    realm.flows().copy("browser", Map.of("newName", newSocialBrowserFlowAlias));
    AuthenticationFlowRepresentation flow = findExistingFlow(newSocialBrowserFlowAlias);
    adjustSocialBrowserFlowExecutions();
    return flow.getId();
  }

  private void adjustSocialBrowserFlowExecutions() {
    List<AuthenticationExecutionInfoRepresentation> executions = getExecutionsForFlow(newSocialBrowserFlowAlias);
    AuthenticationExecutionInfoRepresentation kerberosExecution = getExistingExecutionByProviderId(executions,
        SpnegoAuthenticatorFactory.PROVIDER_ID);
    realm.flows().removeExecution(kerberosExecution.getId());
    AuthenticationExecutionInfoRepresentation formsExecution = getExistingExecutionByDisplayName(executions,
        newSocialBrowserFlowAlias + " forms");
    realm.flows().removeExecution(formsExecution.getId());

    AuthenticationExecutionInfoRepresentation identityProviderRedirectorExecution = getExistingExecutionByProviderId(executions,
        IDENTITY_PROVIDER_REDIRECTOR_PROVIDER_ID);
    realm.flows().removeExecution(identityProviderRedirectorExecution.getId());

    realm.flows().addExecution(newSocialBrowserFlowAlias, Map.of(
        PROVIDER_PARAM_NAME, AlwaysEndSessionAuthenticatorFactory.ID));

    realm.flows().addExecution(newSocialBrowserFlowAlias, Map.of(
        PROVIDER_PARAM_NAME, IDENTITY_PROVIDER_REDIRECTOR_PROVIDER_ID));

    // let's update requirement as a separate step as it was not picked when passing a related param
    // when  creating the executions above
    List<AuthenticationExecutionInfoRepresentation> newExecutions = getExecutionsForFlow(newSocialBrowserFlowAlias);

    AuthenticationExecutionInfoRepresentation endSessionExecution = getExistingExecutionByProviderId(newExecutions,
        AlwaysEndSessionAuthenticatorFactory.ID);
    endSessionExecution.setRequirement(REQUIREMENT_REQUIRED);
    realm.flows().updateExecutions(newSocialBrowserFlowAlias, endSessionExecution);

    AuthenticationExecutionInfoRepresentation newIdentityProviderRedirectorExecution = getExistingExecutionByProviderId(
        newExecutions, IDENTITY_PROVIDER_REDIRECTOR_PROVIDER_ID);
    newIdentityProviderRedirectorExecution.setRequirement(REQUIREMENT_REQUIRED);
    realm.flows().updateExecutions(newSocialBrowserFlowAlias, newIdentityProviderRedirectorExecution);

    addExecutionConfig(newIdentityProviderRedirectorExecution.getId());
  }

  protected void addExecutionConfig(String executionId) {
    // we need to modify data in DB directly because the standard REST API doesn't support this
    runInTransaction(() -> {
      String executionConfigId = KeycloakModelUtils.generateId();
      RealmEntity realmEntity = entityManager.find(RealmEntity.class, realmName);
      AuthenticatorConfigEntity authConfigEntity = new AuthenticatorConfigEntity();
      authConfigEntity.setId(executionConfigId);
      authConfigEntity.setRealm(realmEntity);
      authConfigEntity.setAlias(identityProviderAlias);
      authConfigEntity.setConfig(Map.of("defaultProvider", identityProviderAlias));
      entityManager.persist(authConfigEntity);
      AuthenticationExecutionEntity executionEntity = entityManager.find(AuthenticationExecutionEntity.class, executionId);
      executionEntity.setAuthenticatorConfig(executionConfigId);
      entityManager.persist(executionEntity);
    });
  }

  private void createSocialLoginClient(String socialBrowserFlowId) {
    ClientRepresentation client = new ClientRepresentation();
    String clientSecret = UUID.randomUUID().toString();
    client.setClientId(keycloakClientId);
    client.setPublicClient(true);
    client.setProtocol(OIDCLoginProtocol.LOGIN_PROTOCOL);
    client.setClientAuthenticatorType(ClientIdAndSecretAuthenticator.PROVIDER_ID);
    client.setSecret(clientSecret);
    client.setRedirectUris(List.of("*"));
    client.setStandardFlowEnabled(true);
    client.setEnabled(true);
    client.setWebOrigins(List.of("*"));
    client.setAuthenticationFlowBindingOverrides(Map.of(AuthenticationFlowBindings.BROWSER_BINDING, socialBrowserFlowId));
    realm.clients().create(client);
  }

  private AuthenticationFlowRepresentation findExistingFlow(String flowAlias) {
    List<AuthenticationFlowRepresentation> flows = realm.flows().getFlows();
    return flows.stream().filter((AuthenticationFlowRepresentation f) -> flowAlias.equals(f.getAlias())).findFirst()
        .orElseThrow(() -> new RuntimeException(String.format("Flow with alias %s should exist", flowAlias)));
  }

  private List<AuthenticationExecutionInfoRepresentation> getExecutionsForFlow(String flowAlias) {
    return realm.flows().getExecutions(flowAlias);
  }

  private AuthenticationExecutionInfoRepresentation getExistingExecutionByProviderId(
      List<AuthenticationExecutionInfoRepresentation> executions, String executionProviderId) {
    return executions.stream()
        .filter(execution -> executionProviderId.equals(execution.getProviderId()))
        .findFirst()
        .orElseThrow(
            () -> new RuntimeException(String.format("Execution with provider id %s should exist", executionProviderId)));
  }

  private AuthenticationExecutionInfoRepresentation getExistingExecutionByDisplayName(
      List<AuthenticationExecutionInfoRepresentation> executions, String displayName) {
    return executions.stream()
        .filter(execution -> displayName.equals(execution.getDisplayName()))
        .findFirst()
        .orElseThrow(() -> new RuntimeException(String.format("Execution with display name %s should exist", displayName)));
  }
}
