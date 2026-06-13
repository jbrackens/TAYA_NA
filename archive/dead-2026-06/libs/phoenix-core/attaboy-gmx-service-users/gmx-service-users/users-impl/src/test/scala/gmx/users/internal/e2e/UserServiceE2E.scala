package gmx.users.internal.e2e

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.CustomerDetail
import SBTech.Microservices.DataStreaming.DTO.Login.v1.Login
import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.scaladsl.Source
import akka.stream.testkit.scaladsl.TestSink
import com.lightbend.lagom.scaladsl.api.AdditionalConfiguration
import com.lightbend.lagom.scaladsl.server.{ LagomApplication, LocalServiceLocator }
import com.lightbend.lagom.scaladsl.testkit.{ ServiceTest, TestTopicComponents }
import com.typesafe.config.ConfigFactory
import gmx.dataapi.internal.customer._
import gmx.users.api.UserService
import gmx.users.internal.source.RecordDispatcher
import gmx.users.internal.{ CustomerDetailDataProvider, LoginDataProvider, UserComponents, WalletTransactionDataProvider }
import org.apache.avro.specific.SpecificRecordBase
import org.scalatest.wordspec.AnyWordSpecLike
import org.scalatest.{ BeforeAndAfterAll, GivenWhenThen }

class UserServiceE2E extends ScalaTestWithActorTestKit with AnyWordSpecLike with GivenWhenThen with BeforeAndAfterAll {

  private val server =
    ServiceTest.startServer(ServiceTest.defaultSetup.withJdbc()) { ctx =>
      new LagomApplication(ctx) with UserComponents with LocalServiceLocator with TestTopicComponents {
        override def additionalConfiguration: AdditionalConfiguration =
          super.additionalConfiguration ++ // Tests should be running with in memory DB (for JDBC journal)
              ConfigFactory.parseString(s"""
                              db.default.driver = "org.h2.Driver"
                              db.default.url = "jdbc:h2:mem:play;MODE=PostgreSQL"
                              jdbc-defaults.slick.profile = "slick.jdbc.H2Profile$$"
                              """)
      }
    }

  private val dispatcher = new RecordDispatcher(
    server.application.clusterSharding,
    "sportNation",
    timeout
  )(server.application.executionContext)

  private val client: UserService = server.serviceClient.implement[UserService]

  private val customerLogins: Source[CustomerLoggedIn, _] = client.customerLogins().subscribe.atMostOnceSource
  private val depositLimits: Source[DepositLimitSet, _]   = client.depositLimits().subscribe.atMostOnceSource
  private val timeouts: Source[TimeoutSet, _]             = client.timeouts().subscribe.atMostOnceSource
  private val deposits: Source[FundsDeposited, _]         = client.deposits().subscribe.atMostOnceSource

  override protected def afterAll(): Unit = server.stop()

  "UserService" should {

    "process commands idempotently" in {
      Given("Avro message sequence")
      val eventSequence = loadData("idempotence")

      When("produce command is invoked")
      applySequence(eventSequence)

      Then("eventSourced change should be sent to topic")
      val customerLoginsOutput = customerLogins.runWith(TestSink.probe(server.actorSystem))
      val depositLimitsOutput  = depositLimits.runWith(TestSink.probe(server.actorSystem))
      val timeoutsOutput       = timeouts.runWith(TestSink.probe(server.actorSystem))
      val depositsOutput       = deposits.runWith(TestSink.probe(server.actorSystem))

      val customerLoggedIn: CustomerLoggedIn = customerLoginsOutput.request(1).expectNext()
      customerLoggedIn.getCustomerId.toString should be("928715313")
      //TODO logins should be idempotent | https://flipsports.atlassian.net/browse/GMV3-260
//      customerLoginsOutput.request(1).expectNoMessage()

      val depositLimitSet: DepositLimitSet = depositLimitsOutput.request(1).expectNext()
      depositLimitSet.getCustomerId.toString should be("928715313")
      depositLimitsOutput.request(1).expectNoMessage()

      val timeoutSet: TimeoutSet = timeoutsOutput.request(1).expectNext()
      timeoutSet.getCustomerId.toString should be("928715313")
      timeoutsOutput.request(1).expectNoMessage()

      val fundsDeposited: FundsDeposited = depositsOutput.request(1).expectNext()
      fundsDeposited.getCustomerId.toString should be("1337403966")
      depositsOutput.request(1).expectNoMessage()
    }
  }

  private def loadData(scenario: String): Seq[SpecificRecordBase] =
    new LoginDataProvider(s"/gmx/users/internal/e2e/$scenario/Login-simulated.json").all ++
        new CustomerDetailDataProvider(s"/gmx/users/internal/e2e/$scenario/CustomerDetail-simulated.json").all ++
        new WalletTransactionDataProvider(s"/gmx/users/internal/e2e/$scenario/WalletTransaction-simulated.json").all

  def applySequence(eventSequence: Seq[SpecificRecordBase]): Unit =
    eventSequence
      .sortBy {
        case x: Login          => x.getMessageCreationDate
        case x: CustomerDetail => x.getMessageCreationDate
        case _                 => 0L
      }
      .map(dispatcher.process(_))
}
