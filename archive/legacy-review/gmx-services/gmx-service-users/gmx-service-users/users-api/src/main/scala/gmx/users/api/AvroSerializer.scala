package gmx.users.api

import com.typesafe.config.ConfigFactory
import gmx.common.internal.scala.lagom.serializer.{
  AvroEmbeddedSchemaMessageSerializer,
  AvroSchemaRegistryMessageSerializer,
  AvroSpecificMessageSerializer
}
import gmx.dataapi.internal.customer._

trait AvroMessageSerializerProvider {
  def depositLimitSetSerializer: AvroSpecificMessageSerializer[DepositLimitSet]
  def customerLoggedInSerializer: AvroSpecificMessageSerializer[CustomerLoggedIn]
  def timeOutSetSerializer: AvroSpecificMessageSerializer[TimeoutSet]
  def fundsDepositedSerializer: AvroSpecificMessageSerializer[FundsDeposited]
}

object AvroSchemaRegistryMessageSerializers extends AvroMessageSerializerProvider {

  //TODO we should avoid using config directly, we should inject config | https://flipsports.atlassian.net/browse/GMV3-253
  private lazy val SchemaRegistryUrl = ConfigFactory
    .load()
    .getString("sbtech-processor.schema-registry-url")

  val depositLimitSetSerializer: AvroSpecificMessageSerializer[DepositLimitSet] =
    new AvroSchemaRegistryMessageSerializer[DepositLimitSet](SchemaRegistryUrl)

  val customerLoggedInSerializer: AvroSpecificMessageSerializer[CustomerLoggedIn] =
    new AvroSchemaRegistryMessageSerializer[CustomerLoggedIn](SchemaRegistryUrl)

  val timeOutSetSerializer: AvroSpecificMessageSerializer[TimeoutSet] =
    new AvroSchemaRegistryMessageSerializer[TimeoutSet](SchemaRegistryUrl)

  val fundsDepositedSerializer: AvroSpecificMessageSerializer[FundsDeposited] =
    new AvroSchemaRegistryMessageSerializer[FundsDeposited](SchemaRegistryUrl)
}

object AvroEmbeddedSchemaMessageSerializers extends AvroMessageSerializerProvider {

  val depositLimitSetSerializer: AvroSpecificMessageSerializer[DepositLimitSet] =
    new AvroEmbeddedSchemaMessageSerializer[DepositLimitSet]

  val customerLoggedInSerializer: AvroSpecificMessageSerializer[CustomerLoggedIn] =
    new AvroEmbeddedSchemaMessageSerializer[CustomerLoggedIn]

  val timeOutSetSerializer: AvroSpecificMessageSerializer[TimeoutSet] =
    new AvroEmbeddedSchemaMessageSerializer[TimeoutSet]

  val fundsDepositedSerializer: AvroSpecificMessageSerializer[FundsDeposited] =
    new AvroEmbeddedSchemaMessageSerializer[FundsDeposited]

}
