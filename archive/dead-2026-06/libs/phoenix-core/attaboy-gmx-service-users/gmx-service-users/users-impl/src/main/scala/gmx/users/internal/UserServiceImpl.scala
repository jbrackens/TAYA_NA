package gmx.users.internal

import java.util.UUID

import akka.Done
import akka.cluster.sharding.typed.scaladsl.{ ClusterSharding, EntityRef }
import akka.util.Timeout
import com.lightbend.lagom.scaladsl.api.ServiceCall
import com.lightbend.lagom.scaladsl.api.broker.Topic
import com.lightbend.lagom.scaladsl.api.transport.{ BadRequest, ResponseHeader }
import com.lightbend.lagom.scaladsl.broker.TopicProducer
import com.lightbend.lagom.scaladsl.persistence.{ EventStreamElement, PersistentEntityRegistry }
import com.lightbend.lagom.scaladsl.server.ServerServiceCall
import gmx.common.internal.scala.core.time.TimeUtils.getCurrentTime
import gmx.dataapi.internal.customer.{ FundsDeposited, _ }
import gmx.users.api
import gmx.users.api._
import gmx.users.internal.aggregate.Metadata.{ CustomerHeader, ProcessingHeader }
import gmx.users.internal.aggregate.{ CommandEnvelope, Confirmation, DepositLimit }
import gmx.users.internal.sink.event._
import gmx.users.internal.{ aggregate => internal }

import scala.concurrent.ExecutionContext
import scala.concurrent.duration._

/**
 * Implementation of the UserService.
 */
class UserServiceImpl(
    clusterSharding: ClusterSharding,
    persistentEntityRegistry: PersistentEntityRegistry
  )(implicit ec: ExecutionContext)
  extends UserService {

  /**
   * Looks up the entity for the given ID.
   */
  private def entityRef(id: String): EntityRef[internal.CommandEnvelope] =
    clusterSharding.entityRefFor(internal.UserState.typeKey, id)

  implicit val timeout = Timeout(5.seconds)

  override def setDepositLimit(
      id: String
    ): ServiceCall[api.SetDepositLimit, Done] =
    ServerServiceCall { (requestHeader, request) =>
      val ref = entityRef(id)

      val messageId = requestHeader.getHeader("requestId").getOrElse(UUID.randomUUID().toString)

      ref
        .ask[Confirmation](replyTo =>
          CommandEnvelope(
            internal.SetDepositLimit(
              ProcessingHeader(messageId, request.setBy.setAt, getCurrentTime),
              CustomerHeader(id, request.brandId),
              DepositLimit(DepositLimitScopeEnum.valueOf(request.scope), request.limit, convert(request.setBy), request.brandId)
            ),
            replyTo
          )
        )
        .map {
          case internal.Accepted => (ResponseHeader.Ok, Done)
          case _                 => throw BadRequest("Can't update deposit limit")
        }
    }

  def convert(sb: api.SetBy): internal.SetBy =
    internal.SetBy(sb.userId, sb.setAt)

  override def customerLogins(): Topic[CustomerLoggedIn] =
    TopicProducer.singleStreamWithOffset { fromOffset =>
      persistentEntityRegistry
        .eventStream(internal.UserEvent.Tag, fromOffset)
        .filter(filterForLogins)
        .map(ev => (CustomerLoggedInConverter.convert(ev.event), ev.offset))
    }

  private def filterForLogins(element: EventStreamElement[internal.UserEvent]) =
    element.event.isInstanceOf[internal.CustomerLoggedIn]

  override def depositLimits(): Topic[DepositLimitSet] =
    TopicProducer.singleStreamWithOffset { fromOffset =>
      persistentEntityRegistry
        .eventStream(internal.UserEvent.Tag, fromOffset)
        .filter(filterForDepositLimits)
        .map(ev => (DepositLimitSetConverter.convert(ev.event), ev.offset))
    }

  private def filterForDepositLimits(element: EventStreamElement[internal.UserEvent]) =
    element.event.isInstanceOf[internal.DepositLimitSet]

  override def timeouts(): Topic[TimeoutSet] =
    TopicProducer.singleStreamWithOffset { fromOffset =>
      persistentEntityRegistry
        .eventStream(internal.UserEvent.Tag, fromOffset)
        .filter(filterForTimeouts)
        .map(ev => (TimeoutSetConverter.convert(ev.event), ev.offset))
    }

  private def filterForTimeouts(element: EventStreamElement[internal.UserEvent]) =
    element.event.isInstanceOf[internal.TimeOutSet]

  override def deposits(): Topic[FundsDeposited] =
    TopicProducer.singleStreamWithOffset { fromOffset =>
      persistentEntityRegistry
        .eventStream(internal.UserEvent.Tag, fromOffset)
        .filter(filterForDeposits)
        .map(ev => (FundsDepositedConverter.convert(ev.event), ev.offset))
    }

  private def filterForDeposits(element: EventStreamElement[internal.UserEvent]) =
    element.event.isInstanceOf[internal.FundsDeposited]
}
