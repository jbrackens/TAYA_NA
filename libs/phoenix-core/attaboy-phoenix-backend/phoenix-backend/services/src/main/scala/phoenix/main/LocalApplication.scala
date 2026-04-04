package phoenix.main
import scala.util.Try

import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.ActorContext
import com.typesafe.config.Config
import com.typesafe.config.ConfigFactory

import phoenix.cluster.NodeRole
import phoenix.core.UnitUtils.UnitCastOps
import phoenix.jwt.KeycloakInstallation
import phoenix.keycloak.KeycloakClient
import phoenix.keycloak.KeycloakConfig
import phoenix.main.Application._

trait LocalApplication extends Application with Main {
  val configureLocalKeycloakKey = "keycloak.configure-local"

  override def beforeApplicationStart(context: ActorContext[_]): Unit = {}

  override def afterApplicationStart(context: ActorContext[_]): Unit = {
    val config = context.system.settings.config
    if (Try(config.getBoolean(configureLocalKeycloakKey)).getOrElse(false)) {
      configureLocalKeycloak(context.system)
    }
  }

  protected def startup(
      roles: List[NodeRole],
      akkaRemotePort: Int,
      topConfig: Config = ConfigFactory.empty,
      configureLocalKeycloak: Boolean = false): ActorSystem[Nothing] = {
    // Override the configuration of the port when specified as program argument
    val config = topConfig
      .withFallback(ConfigFactory.parseString(s"""
      akka.remote.artery.canonical.port = $akkaRemotePort
      akka.cluster.roles = ${roles.map(_.entryName).mkString("[", ",", "]")}
      $configureLocalKeycloakKey = $configureLocalKeycloak
      """))
      .withFallback(ConfigFactory.load())

    ActorSystem[RootCommand](
      RootBehavior(
        HttpPorts(
          forRestServer = akkaRemotePort + 11000,
          forDevServer = akkaRemotePort + 10000,
          forWebSockets = akkaRemotePort + 7000,
          forBetgeniusServer = akkaRemotePort + 5000,
          forPxpServer = akkaRemotePort + 4000)),
      "Phoenix",
      config)
  }

  private def configureLocalKeycloak(system: ActorSystem[_]): Unit = {
    val keycloakConfig = KeycloakConfig.of(system)
    val keycloakInstallation = KeycloakInstallation.load(keycloakConfig.clientConfLocation)
    val realm = keycloakInstallation.realm
    val client = new KeycloakClient(keycloakInstallation.authServerUrl, "admin", "admin")
    if (!client.doesRealmExist(realm)) {
      client.initNewRealmAndClient(realm).toUnit()
    }
  }

}
