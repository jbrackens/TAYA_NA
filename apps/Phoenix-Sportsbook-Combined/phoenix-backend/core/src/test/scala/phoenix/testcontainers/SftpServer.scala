package phoenix.testcontainers

import org.testcontainers.containers.GenericContainer

import phoenix.core.Clock

object SftpServer {
  val dockerImage = "atmoz/sftp:latest"

  lazy val instance: SftpServer = {
    val container = new SftpServer()
    container.start()
    container
  }
}

class SftpServer extends GenericContainer[SftpServer](SftpServer.dockerImage) with ContainerSupport {
  private val clock: Clock = Clock.utcClock
  private val user = "backend"
  private val password = "backend"

  lazy val connectionProperties: ConnectionProperties =
    ConnectionProperties(getHost, getFirstMappedPort, user, password)

  withCommand(s"$user:$password")
  withExposedPorts(22)
  withReuse(true)

  def initNewFolder(): String = {
    val randomDir = s"phoenix_${generateRandomNamespace(clock)}"
    val fullPath = s"/home/$user/$randomDir"

    logger().debug(s"Create tmp directory: $fullPath")
    execInContainer("mkdir", fullPath)
    execInContainer("chown", user, fullPath)

    randomDir
  }
}

case class ConnectionProperties(host: String, port: Int, user: String, password: String)
