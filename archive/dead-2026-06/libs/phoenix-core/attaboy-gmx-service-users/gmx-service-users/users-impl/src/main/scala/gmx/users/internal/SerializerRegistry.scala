package gmx.users.internal

import com.lightbend.lagom.scaladsl.playjson.{ JsonSerializer, JsonSerializerRegistry }
import gmx.users.internal.aggregate._
import gmx.users.internal.logic.EventsJsonConverters._
import gmx.users.internal.logic.ResponsesJsonConverters._
import gmx.users.internal.logic.StateJsonConverters._

/**
 * Akka serialization, used by both persistence and remoting, needs to have
 * serializers registered for every type serialized or deserialized. While it's
 * possible to use any serializer you want for Akka messages, out of the box
 * Lagom provides support for JSON, via this registry abstraction.
 *
 * The serializers are registered here, and then provided to Lagom in the
 * application loader.
 *
 * State and events can use play-json, but commands should use jackson because of ActorRef[T] (see application.conf)
 */
object UserSerializerRegistry extends JsonSerializerRegistry {

  override def serializers: Seq[JsonSerializer[_]] =
    Seq(
      // state
      JsonSerializer[DepositLimitSet],
      JsonSerializer[TimeOutSet],
      JsonSerializer[CustomerLoggedIn],
      JsonSerializer[CustomerLoggedOut],
      JsonSerializer[FundsDeposited],
      JsonSerializer[FundsWithdrawn],
      JsonSerializer[BonusRequested],
      JsonSerializer[SportsBetPlaced],
      JsonSerializer[CasinoBetPlaced],
      JsonSerializer[BetSettled],
      JsonSerializer[SelfAssessmentCompleted],
      // events
      JsonSerializer[UserState],
      // the replies use play-json as well
      JsonSerializer[Confirmation],
      JsonSerializer[Accepted],
      JsonSerializer[Rejected]
    )

}
