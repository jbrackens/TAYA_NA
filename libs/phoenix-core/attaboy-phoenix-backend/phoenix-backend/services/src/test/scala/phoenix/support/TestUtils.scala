package phoenix.support

import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

import akka.actor.typed.scaladsl.Behaviors
import akka.actor.typed.{ActorSystem => TypedActorSystem}
import akka.persistence.testkit.scaladsl.EventSourcedBehaviorTestKit
import akka.stream.Materializer
import akka.stream.SourceRef
import akka.stream.scaladsl.Sink
import org.apache.commons.io.IOUtils

import phoenix.markets.MarketTags

object TestUtils {

  def testCleanUp(system: TypedActorSystem[Nothing]): Unit = {
    Materializer.matFromSystem(system).shutdown()
    Await.result(system.whenTerminated, 20.seconds)
  }

  val eventSourcedBehaviorTestKitConfig =
    EventSourcedBehaviorTestKit.config.withFallback(ConfigFactory.fromConfigFile("application-es-behavior-test"))

  val testBehavior = Behaviors.receive[Any] {
    case _ => Behaviors.same
  }

  val failureReason = "whoops!"

  val marketTags = MarketTags.marketTags

  val keycloakJson =
    """
      |{
      |  "realm": "phoenix",
      |  "auth-server-url": "https://localhost:8443/auth/",
      |  "ssl-required": "external",
      |  "resource": "phoenix-backend",
      |  "verify-token-audience": true,
      |  "credentials": {
      |    "secret": "no-way"
      |  },
      |  "confidential-port": 0,
      |  "policy-enforcer": {}
      |}
      |""".stripMargin

  val keycloakConfig = IOUtils.toInputStream(keycloakJson, "UTF-8")

  def subscribeToFeedUpdates(feed: SourceRef[_])(implicit system: TypedActorSystem[_]): akka.testkit.TestProbe = {
    implicit val mat: Materializer = Materializer(system)
    val probe = akka.testkit.TestProbe()(system.classicSystem)
    // Note that the value for `onCompleteMessage` should be serializable,
    // hence we can't `()` (the Unit value) since scala.runtime.BoxedUnit can't be serialized.
    val sink = Sink.actorRef(probe.ref, onCompleteMessage = "<empty>", onFailureMessage = e => throw e)
    feed.source.runWith(sink)
    probe
  }
}
