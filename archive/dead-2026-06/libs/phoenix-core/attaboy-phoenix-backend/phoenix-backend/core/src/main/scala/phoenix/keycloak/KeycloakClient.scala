package phoenix.keycloak
import java.util.UUID

import scala.jdk.CollectionConverters._

import org.keycloak.admin.client.CreatedResponseUtil
import org.keycloak.admin.client.KeycloakBuilder
import org.keycloak.admin.client.resource.RealmResource
import org.keycloak.admin.client.{Keycloak => KeycloakAdminClient}
import org.keycloak.representations.idm._

import phoenix.core.UnitUtils.UnitCastOps
import phoenix.keycloak.KeycloakClient.KeycloakUserId
import phoenix.keycloak.KeycloakClient.RealmClient

class KeycloakClient(authServerUrl: String, adminUserName: String, adminPassword: String) {

  private val masterRealmClient: KeycloakAdminClient = KeycloakBuilder
    .builder()
    .serverUrl(authServerUrl)
    .realm("master")
    .clientId("admin-cli")
    .username(adminUserName)
    .password(adminPassword)
    .build()

  def initNewRealmAndClient(realmName: String): (RealmResource, RealmClient) = {
    val realmResource = createRealm(realmName)
    createRoles(realmResource)
    createUserGroups(realmResource)

    val clientId = createPhoenixClient(realmResource)
    (realmResource, clientId)
  }

  private def createRealm(realmName: String): RealmResource = {
    val createRealmRequest = {
      val request = new RealmRepresentation()
      request.setRealm(realmName)
      request.setEnabled(true)
      request.setClientSessionIdleTimeout(900)
      request
    }
    masterRealmClient.realms().create(createRealmRequest)
    masterRealmClient.realm(realmName)
  }

  def doesRealmExist(realmName: String): Boolean =
    masterRealmClient.realms().findAll().asScala.exists(_.getRealm == realmName)

  def createUser(realmName: String, userRepresentation: UserRepresentation): KeycloakUserId = {
    userRepresentation.setGroups(List("punters").asJava)
    val response = masterRealmClient.realm(realmName).users().create(userRepresentation)
    val userId = CreatedResponseUtil.getCreatedId(response)
    userId
  }

  private def createUserGroups(realm: RealmResource): Unit = {
    realm
      .groups()
      .add {
        val phoenixUsersGroup = new GroupRepresentation()
        phoenixUsersGroup.setName("punters")
        phoenixUsersGroup
      }
      .toUnit()
  }

  private def createRoles(realm: RealmResource): Unit = {
    val scopeParamRequired = false
    realm.roles().create(new RoleRepresentation("admin", "Role for backoffice admins", scopeParamRequired))
  }

  private def createPhoenixClient(realm: RealmResource): RealmClient = {
    val realmClient = createRealmClient(realm)
    grantRolesToServiceAccount(realm, realmClient)
    realmClient
  }

  private def createRealmClient(realm: RealmResource): RealmClient = {
    val keycloakInternalId = UUID.randomUUID().toString
    val clientId = "phoenix-backend"

    realm.clients().create {
      val request = new ClientRepresentation()
      request.setId(keycloakInternalId)
      request.setClientId(clientId)
      request.setSecret("localsecret")
      request.setStandardFlowEnabled(false)
      request.setImplicitFlowEnabled(false)
      request.setDirectAccessGrantsEnabled(true)
      request.setServiceAccountsEnabled(true)
      request.setAuthorizationServicesEnabled(true)
      request.setDefaultClientScopes(List("roles").asJava)
      request
    }

    RealmClient(keycloakInternalId, clientId)
  }

  private def grantRolesToServiceAccount(realm: RealmResource, client: RealmClient): Unit = {
    val serviceAccountUser = realm.clients().get(client.internalKeycloakId).getServiceAccountUser
    val serviceAccountResource = realm.users().get(serviceAccountUser.getId)
    val realmManagementClient = realm.clients().findByClientId("realm-management").asScala.head
    val allAvailableRoles = realm.clients().get(realmManagementClient.getId).roles().list().asScala
    val rolesToGrant = allAvailableRoles.filter { role =>
      Set("manage-users", "query-clients", "query-groups", "query-users", "view-clients", "view-realm", "view-users")
        .contains(role.getName)
    }

    serviceAccountResource.roles().clientLevel(realmManagementClient.getId).add(rolesToGrant.asJava)
  }
}

object KeycloakClient {
  type KeycloakUserId = String
  case class RealmClient(internalKeycloakId: String, clientId: String)
}
