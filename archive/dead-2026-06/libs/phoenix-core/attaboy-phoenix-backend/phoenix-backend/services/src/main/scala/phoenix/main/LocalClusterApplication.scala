package phoenix.main
import phoenix.cluster.NodeRole.BetsRole
import phoenix.cluster.NodeRole.MarketsRole
import phoenix.cluster.NodeRole.PuntersRole
import phoenix.cluster.NodeRole.ReportsRole
import phoenix.cluster.NodeRole.WalletsRole
import phoenix.core.UnitUtils.UnitCastOps

/**
 * Starts a cluster in the same JVM (2 of each type of node role)
 */
object LocalClusterApplication extends LocalApplication {

  override def runApplication(args: Array[String]): Unit = {
    require(args.length == 0, "Usage: empty argument list")

    startup(List(BetsRole), 2551, configureLocalKeycloak = true).toUnit()
    startup(List(MarketsRole), 2552).toUnit()
    startup(List(WalletsRole), 2553).toUnit()
    startup(List(PuntersRole), 2554).toUnit()
    startup(List(ReportsRole), 2555).toUnit()
  }

}
