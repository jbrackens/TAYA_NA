package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1

import java.time.Instant
import java.util.UUID

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.dataapi.internal.customers.operations._
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.Types.{CustomerDetail, CustomerStateChange}
import net.flipsports.gmx.streaming.internal.customers.operation.operation._
import org.apache.flink.api.java.tuple.Tuple2

trait StateChangeTransformer extends Serializable with LazyLogging {

  def transform(record: CustomerDetail.ValueType, brand: Brand, actionType: ActionType, payload: Option[String] = None): Tuple2[CustomerStateChange.KeyType, CustomerStateChange.ValueType] = {
    val customer: CustomerDetail.ValueType = record
    val customerId = transformKey(customer.getCustomerID.toString)
    val stateChange = transformBaseValue(brand, actionType, payload)
    stateChange.setExternalUserId(customer.getCustomerID.toString)
    stateChange.setEmail(fixEmail(customer.getEmail))
    new Tuple2(customerId, stateChange)
  }

  def transformKey(externalCustomerId: String) = {
    val customerId = new CustomerStateChange.KeyType()
    customerId.setExternalUserId(externalCustomerId)
    customerId
  }

  def transformBaseValue(brand: Brand, actionType: ActionType, payload: Option[String]): CustomerStateChange.ValueType = {
    val stateChange = new CustomerStateChange.ValueType()
    stateChange.setPayload(new StraightValue(payload.getOrElse(transformPayload()), OperationKind.add))
    stateChange.setUuid(UUID.randomUUID().toString)
    stateChange.setCreatedDateUTC(Instant.now.toEpochMilli)
    stateChange.setCompanyId(brand.sourceBrand.uuid)
    stateChange.setAction(actionType)
    stateChange.setOperationTrigger(operationTrigger())
    stateChange
  }

  def transformPayload() : String

  def operationTrigger(): String
}
