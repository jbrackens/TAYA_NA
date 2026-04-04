package gmx.users.internal.source

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.CustomerDetail
import SBTech.Microservices.DataStreaming.DTO.Login.v1.Login
import SBTech.Microservices.DataStreaming.DTO.WalletTransaction.v1.WalletTransaction
import akka.cluster.sharding.typed.scaladsl.{ ClusterSharding, EntityRef }
import akka.util.Timeout
import gmx.users.internal.aggregate.{ CommandEnvelope, Confirmation, UserCommand, UserState }
import gmx.users.internal.source.sbtech.{ SbTechCustomerDetailProcessor, SbTechLoginProcessor, SbTechWalletTransactionProcessor }
import org.apache.avro.specific.SpecificRecord

import scala.concurrent.{ ExecutionContext, Future }

class RecordDispatcher(
    clusterSharding: ClusterSharding,
    brandId: String,
    askTimeout: Timeout
  )(implicit ec: ExecutionContext) {

  def process(
      message: SpecificRecord
    ): Future[Confirmation] = {

    val processed  = executeProcessor(message)
    val customerId = processed._1
    val commands   = processed._2

    val entity = entityRef(customerId)

    val confirmations = commands.map(cmd =>
      entity
        .ask[Confirmation] { replyTo =>
          CommandEnvelope(cmd, replyTo)
        }(
          askTimeout
        )
    )

    Future
      .sequence(confirmations)
      .map(_.head) //TODO confirm with Lightbend best strategy to split incoming message into commands | https://flipsports.atlassian.net/browse/GMV3-350
  }

  private def executeProcessor(message: SpecificRecord): (String, Seq[UserCommand]) =
    message match {
      case x: Login             => processRecord(SbTechLoginProcessor, x)
      case x: CustomerDetail    => processRecord(SbTechCustomerDetailProcessor, x)
      case x: WalletTransaction => processRecord(SbTechWalletTransactionProcessor, x)
      case x                    => throw new UnsupportedOperationException(s"Unsupported message type: ${x.getSchema}")
    }

  private def processRecord[T <: SpecificRecord](
      processor: RecordToCommandProcessor[T],
      message: T
    ): (String, Seq[UserCommand]) =
    (
      processor.provideCustomerId(message),
      processor.extractCommands(brandId, message)
    )

  def entityRef(id: String): EntityRef[CommandEnvelope] =
    clusterSharding.entityRefFor(UserState.typeKey, id)
}
