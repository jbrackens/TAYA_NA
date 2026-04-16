package phoenix.main
import phoenix.cluster.NodeRole
import phoenix.core.UnitUtils.UnitCastOps

/**
 * Starts the appropriate node roles on the port supplied.
 *
 * Note that ports 2551/2552 MUST be supplied or the cluster won't form locally
 */
object SingleNodeApplication extends LocalApplication with Main {

  override def runApplication(args: Array[String]): Unit = {
    require(args.length == 2, "Usage: role port")
    val nodeRole = NodeRole.withNameOption(args(0))
    require(nodeRole.nonEmpty, s"Invalid role: ${args(0)}")
    val akkaRemotePort = args(1).toInt
    super.startup(List(nodeRole.get), akkaRemotePort).toUnit()
  }
}
