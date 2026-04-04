package stella.identity.rest;

import static javax.ws.rs.core.Response.Status.*;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.MatcherAssert.assertThat;
import static stella.identity.utils.ResponseMatcher.hasStatus;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import javax.persistence.Query;

import org.apache.commons.lang.RandomStringUtils;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.shaded.okhttp3.Request;
import org.testcontainers.shaded.okhttp3.RequestBody;
import org.testcontainers.shaded.okhttp3.Response;

import org.keycloak.representations.AccessTokenResponse;
import org.keycloak.representations.idm.ClientRepresentation;
import org.keycloak.representations.idm.KeysMetadataRepresentation;
import org.keycloak.util.JsonSerialization;

import stella.identity.jpa.Project;
import stella.identity.model.SignatureRequest;
import stella.identity.rest.responses.SignatureResponseWrapper;

public class AdminRestResourceIT extends RestResourceTestBase {

  private AccessTokenResponse userWithOtherPermissionsToken;
  private AccessTokenResponse signerToken;
  private AccessTokenResponse onBehalfOfOtherProjectSignerToken;
  private String kid;
  private String otherProjectKid;
  private Project project;
  private Project otherProject;
  private final String realmName = "master";
  private final String payload = RandomStringUtils.randomAlphanumeric(50);

  private String signUrl() {
    return String.format("%s/auth/realms/%s/stella/admin/sign", keycloakUrl(), realmName);
  }

  private String signUrl(UUID projectPublicId) {
    return String.format("%s/auth/realms/%s/stella/admin/sign/for/%s", keycloakUrl(), realmName, projectPublicId);
  }

  private final static String ADMIN_SIGN_PERMISSION = "oidc:admin:sign";

  private final String signOnBehalfOfPermission(String kid) {
    return String.format("oidc:admin:sign:%s", kid);
  }

  @BeforeAll
  void before() {
    ClientRepresentation client = createRandomClient(realmName);
    String clientId = client.getClientId();
    String clientSecret = client.getSecret();
    project = addProject(realmName);
    kid = createRsaKey(realmName);
    setProjectKey(project.getId(), kid);
    associateClientWithPrimaryProject(clientId, project.getId(), realmName);
    ClientRepresentation otherClient = createRandomClient(realmName);
    otherProject = addProject(realmName);
    otherProjectKid = createRsaKey(realmName);
    setProjectKey(otherProject.getId(), otherProjectKid);
    associateClientWithPrimaryProject(otherClient.getClientId(), otherProject.getId(), realmName);

    addStellaPermissionsToRealm(realmName, List.of(signOnBehalfOfPermission(kid), signOnBehalfOfPermission(otherProjectKid)));

    List<String> allNotSignPermissions = stellaPermissions.stream()
        .filter(p -> !p.startsWith(ADMIN_SIGN_PERMISSION))
        .collect(Collectors.toList());

    userWithOtherPermissionsToken = userWithPermissionToken(allNotSignPermissions, realmName, clientId, clientSecret);
    signerToken = userWithPermissionToken(List.of(ADMIN_SIGN_PERMISSION), realmName, clientId, clientSecret);
    onBehalfOfOtherProjectSignerToken = userWithPermissionToken(List.of(signOnBehalfOfPermission(otherProjectKid)), realmName,
        clientId, clientSecret);
  }

  @Test
  void shouldFailSigningIfTokenNotProvided() throws IOException {
    SignatureRequest request = new SignatureRequest(payload);
    RequestBody body = RequestBody.create(JSON, JsonSerialization.writeValueAsString(request));
    Response response = send(new Request.Builder().url(signUrl()).post(body));
    assertThat(response, hasStatus(UNAUTHORIZED));
  }

  @Test
  void shouldFailSigningWithoutSignPermission() throws IOException {
    Response response = signPayload(payload, idToken(userWithOtherPermissionsToken));
    assertThat(response, hasStatus(FORBIDDEN));
  }

  @Test
  void shouldFailSigningWithSignAnyPermission() throws IOException {
    Response response = signPayload(payload, idToken(onBehalfOfOtherProjectSignerToken));
    assertThat(response, hasStatus(FORBIDDEN));
  }

  @Test
  void shouldFailSigningIfProjectHasNoKeyConfigured() throws IOException {
    ClientRepresentation client = createRandomClient(realmName);
    String clientId = client.getClientId();
    String clientSecret = client.getSecret();
    Project project = addProject(realmName);
    associateClientWithPrimaryProject(clientId, project.getId(), realmName);
    String signerToken = userWithPermissionToken(List.of(ADMIN_SIGN_PERMISSION), realmName, clientId, clientSecret)
        .getIdToken();

    Response response = signPayload(payload, signerToken);
    assertThat(response, hasStatus(FORBIDDEN));
  }

  @Test
  void shouldSignPayload()
      throws IOException, NoSuchAlgorithmException, InvalidKeyException, SignatureException, InvalidKeySpecException {
    Response response = signPayload(payload, idToken(signerToken));
    assertThat(response, hasStatus(OK));
    SignatureResponseWrapper signature = JsonSerialization.readValue(response.body().string(), SignatureResponseWrapper.class);
    assertThat(verifySignature(payload, signature.getDetails().getSignature(), kid), is(true));
  }

  @Test
  void shouldFailSigningBehalfOfProjectIfTokenNotProvided() throws IOException {
    SignatureRequest request = new SignatureRequest(payload);
    RequestBody body = RequestBody.create(JSON, JsonSerialization.writeValueAsString(request));
    Response response = send(new Request.Builder().url(signUrl(otherProject.getProjectPublicId())).post(body));
    assertThat(response, hasStatus(UNAUTHORIZED));
  }

  @Test
  void shouldFailSigningBehalfOfProjectWithoutSignPermission() throws IOException {
    Response response = signPayloadBehalfOf(payload, idToken(userWithOtherPermissionsToken), project.getProjectPublicId());
    assertThat(response, hasStatus(FORBIDDEN));
  }

  @Test
  void shouldFailSigningBehalfOfProjectWithSignPermission() throws IOException {
    Response response = signPayloadBehalfOf(payload, idToken(signerToken), otherProject.getProjectPublicId());
    assertThat(response, hasStatus(FORBIDDEN));
  }

  @Test
  void shouldFailSigningBehalfOfProjectIfProjectHasNoKeyConfigured() throws IOException {
    ClientRepresentation client = createRandomClient(realmName);
    Project projectWithoutKey = addProject(realmName);
    associateClientWithPrimaryProject(client.getClientId(), projectWithoutKey.getId(), realmName);

    Response response = signPayloadBehalfOf(payload, idToken(onBehalfOfOtherProjectSignerToken),
        projectWithoutKey.getProjectPublicId());
    assertThat(response, hasStatus(FORBIDDEN));
  }

  @Test
  void shouldFailSigningBehalfOfProjectIfProjectHasOtherKeyConfigured() throws IOException {
    Response response = signPayloadBehalfOf(payload, idToken(onBehalfOfOtherProjectSignerToken), project.getProjectPublicId());
    assertThat(response, hasStatus(FORBIDDEN));
  }

  @Test
  void shouldSignPayloadBehalfOfProject()
      throws IOException, NoSuchAlgorithmException, InvalidKeyException, SignatureException, InvalidKeySpecException {
    Response response = signPayloadBehalfOf(payload, idToken(onBehalfOfOtherProjectSignerToken),
        otherProject.getProjectPublicId());
    assertThat(response, hasStatus(OK));
    SignatureResponseWrapper signature = JsonSerialization.readValue(response.body().string(), SignatureResponseWrapper.class);
    assertThat(verifySignature(payload, signature.getDetails().getSignature(), otherProjectKid), is(true));
  }

  private Response signPayload(String payload, String idToken) throws IOException {
    SignatureRequest request = new SignatureRequest(payload);
    RequestBody body = RequestBody.create(JSON, JsonSerialization.writeValueAsString(request));
    return send(builderWithUrlAndToken(signUrl(), idToken).post(body));
  }

  private Response signPayloadBehalfOf(String payload, String idToken, UUID projectPublicId) throws IOException {
    SignatureRequest request = new SignatureRequest(payload);
    RequestBody body = RequestBody.create(JSON, JsonSerialization.writeValueAsString(request));
    return send(builderWithUrlAndToken(signUrl(projectPublicId), idToken).post(body));
  }

  private void setProjectKey(Long projectId, String kid) {
    runInTransaction(() -> {
      Query query = entityManager.createQuery("UPDATE Project SET kid =:kid WHERE id = :projectId");
      query.setParameter("kid", kid);
      query.setParameter("projectId", projectId);
      query.executeUpdate();
    });
  }

  private Boolean verifySignature(String payload, String signature, String kid)
      throws NoSuchAlgorithmException, InvalidKeyException, SignatureException, InvalidKeySpecException {
    KeysMetadataRepresentation.KeyMetadataRepresentation keyMetadataRepresentation = keycloakInstanceDefault.realm(realmName)
        .keys()
        .getKeyMetadata()
        .getKeys()
        .stream()
        .filter(key -> key.getKid().equals(kid))
        .findFirst()
        .orElseThrow();
    Signature signature1 = Signature.getInstance("SHA256withRSA");
    signature1.initVerify(parsePublicKeyString(keyMetadataRepresentation.getPublicKey()));
    signature1.update(payload.getBytes(StandardCharsets.UTF_8));
    return signature1.verify(Base64.getUrlDecoder().decode(signature));
  }

  private PublicKey parsePublicKeyString(String key) throws NoSuchAlgorithmException, InvalidKeySpecException {
    byte[] byteKey = Base64.getDecoder().decode(key.getBytes());
    X509EncodedKeySpec X509publicKey = new X509EncodedKeySpec(byteKey);
    KeyFactory kf = KeyFactory.getInstance("RSA");
    return kf.generatePublic(X509publicKey);
  }
}
