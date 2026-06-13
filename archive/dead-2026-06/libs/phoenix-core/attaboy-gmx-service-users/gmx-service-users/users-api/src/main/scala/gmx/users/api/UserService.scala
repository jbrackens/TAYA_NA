package gmx.users.api

import java.time.ZonedDateTime

import akka.Done
import com.lightbend.lagom.scaladsl.api.broker.Topic
import com.lightbend.lagom.scaladsl.api.broker.kafka.{ KafkaProperties, PartitionKeyStrategy }
import com.lightbend.lagom.scaladsl.api.{ Descriptor, Service, ServiceCall }
import com.typesafe.config.ConfigFactory
import gmx.dataapi.internal.customer._
import play.api.libs.json.{ Format, Json }

object UserService {
  //TODO move topic names to configuration and create DEV/PROD topics in kafka | https://flipsports.atlassian.net/browse/GMV3-336
  val CustomerLoginsTopicName = "gmx-user-sebtom.customer-logins"
  val DepositLimitsTopicName  = "gmx-user-sebtom.customer-deposit-limits"
  val TimeOutsTopicName       = "gmx-user-sebtom.customer-timeouts"
  val DepositsTopicName       = "gmx-user-sebtom.customer-deposits"
}

/**
 * Service require appropriate serializers of AVRO messages. By default is uses SchemaRegistry based, to switch to Embedded set `sbtech-processor.use-registry = false` in conf.
 */
trait UserService extends Service {

  //TODO we should avoid using config directly, we should inject config | https://flipsports.atlassian.net/browse/GMV3-253
  lazy val useRegistry = ConfigFactory
    .load()
    .getBoolean("sbtech-processor.use-registry")

  val serializerProviders: AvroMessageSerializerProvider =
    if (useRegistry)
      AvroSchemaRegistryMessageSerializers
    else
      AvroEmbeddedSchemaMessageSerializers

  final override def descriptor: Descriptor = {
    import Service._

    named("user-service")
      .withCalls(pathCall("/api/users/depositlimit/:id", setDepositLimit _))
      .withTopics(
        topic(UserService.CustomerLoginsTopicName, customerLogins _)(
          serializerProviders.customerLoggedInSerializer
        ).addProperty(
          KafkaProperties.partitionKeyStrategy,
          // FIXME partition key should use AVRO | https://flipsports.atlassian.net/browse/GMV3-249
          PartitionKeyStrategy[CustomerLoggedIn](_.getCustomerId.toString)
        ),
        topic(UserService.DepositLimitsTopicName, depositLimits _)(
          serializerProviders.depositLimitSetSerializer
        ).addProperty(
          KafkaProperties.partitionKeyStrategy,
          PartitionKeyStrategy[DepositLimitSet](_.getCustomerId.toString)
        ),
        topic(UserService.TimeOutsTopicName, timeouts _)(
          serializerProviders.timeOutSetSerializer
        ).addProperty(
          KafkaProperties.partitionKeyStrategy,
          PartitionKeyStrategy[TimeoutSet](_.getCustomerId.toString)
        ),
        topic(UserService.DepositsTopicName, deposits _)(
          serializerProviders.fundsDepositedSerializer
        ).addProperty(
          KafkaProperties.partitionKeyStrategy,
          PartitionKeyStrategy[FundsDeposited](_.getCustomerId.toString)
        )
      )
      .withAutoAcl(true)
  }

  /**
   * HTTP operations
   */
  def setDepositLimit(id: String): ServiceCall[SetDepositLimit, Done]

  /**
   * Kafka topics exposed
   */
  def customerLogins(): Topic[CustomerLoggedIn]

  def depositLimits(): Topic[DepositLimitSet]

  def timeouts(): Topic[TimeoutSet]

  def deposits(): Topic[FundsDeposited]

}

case class SetDepositLimit(
    scope: String,
    limit: BigDecimal,
    setBy: SetBy,
    brandId: String)

object SetDepositLimit {
  implicit val format: Format[SetDepositLimit] = Json.format
}

case class SetBy(
    userId: String,
    setAt: ZonedDateTime)

object SetBy {
  implicit val format: Format[SetBy] = Json.format
}
