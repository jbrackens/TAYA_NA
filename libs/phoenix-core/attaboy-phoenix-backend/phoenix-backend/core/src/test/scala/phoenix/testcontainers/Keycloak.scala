package phoenix.testcontainers

import java.io.File
import java.io.PrintWriter

import com.github.dockerjava.api.command.InspectContainerResponse
import dasniko.testcontainers.keycloak.KeycloakContainer
import io.circe.Json
import org.keycloak.admin.client.resource.RealmResource
import org.keycloak.representations.idm.UserRepresentation

import phoenix.core.Clock
import phoenix.keycloak.KeycloakClient
import phoenix.keycloak.KeycloakClient.KeycloakUserId
import phoenix.keycloak.KeycloakClient.RealmClient
import phoenix.keycloak.KeycloakConfig
import phoenix.testcontainers.Keycloak.KeycloakRealm

object Keycloak {
  lazy val instance: Keycloak = {
    val container = new Keycloak()
    container.start()
    container
  }

  case class KeycloakRealm(name: String, config: KeycloakConfig)
}

final class Keycloak extends KeycloakContainer with ContainerSupport {
  withReuse(true)

  private val clock: Clock = Clock.utcClock
  private var keycloakClient: KeycloakClient = _

  override def containerIsStarted(containerInfo: InspectContainerResponse, reused: Boolean): Unit = {
    super.containerIsStarted(containerInfo, reused)
    initKeycloakClient()
  }

  private def initKeycloakClient(): Unit = {
    keycloakClient = new KeycloakClient(
      authServerUrl = getAuthServerUrl,
      adminUserName = getAdminUsername,
      adminPassword = getAdminPassword)
  }

  def initNewRealm(): KeycloakRealm = {
    val realmName = s"phoenix_${generateRandomNamespace(clock)}"
    val (realm, client) = keycloakClient.initNewRealmAndClient(realmName)
    KeycloakRealm(realmName, KeycloakConfig(installationFilePath(realm, client)))
  }

  def createUser(realm: KeycloakRealm, userRepresentation: UserRepresentation): KeycloakUserId = {
    keycloakClient.createUser(realm.name, userRepresentation)
  }

  private def installationFilePath(realm: RealmResource, client: RealmClient): String = {
    val installationJson = {
      val inputJson =
        realm.clients().get(client.internalKeycloakId).getInstallationProvider("keycloak-oidc-keycloak-json")
      val parsedInputJson =
        io.circe.parser.parse(inputJson).getOrElse(throw new RuntimeException("Cannot parse installation JSON"))
      parsedInputJson.mapObject(_.add("verify-token-audience", Json.False)).toString
    }

    val temporaryInstallationFile = File.createTempFile("installation-", ".json")
    temporaryInstallationFile.deleteOnExit()
    new PrintWriter(temporaryInstallationFile) { write(installationJson); close() }

    temporaryInstallationFile.getAbsolutePath
  }
}
