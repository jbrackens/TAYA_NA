package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1

import net.flipsports.gmx.dataapi.internal.customers.operations.ActionType
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.Types
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerStateChange
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.{Flag, OperationTrigger}
import net.flipsports.gmx.streaming.internal.customers.operation.operation.fixEmail
import org.apache.flink.api.java.tuple.Tuple2

class DummyPreJoinLoginConditionalMapper(brand: Brand) extends StateChangeTransformer
  with ConditionalMapFunction[Types.PreJoin.KeyType, Types.Logins.ValueType, CustomerStateChange.KeyType, CustomerStateChange.ValueType]{

  override def map(record: Tuple2[Types.PreJoin.KeyType, Types.Logins.ValueType]): Tuple2[CustomerStateChange.KeyType, CustomerStateChange.ValueType] = {
    val customerId = transformKey(record.f0.toString)
    val stateChange = transformBaseValue(brand, ActionType.FLAG, None)
    stateChange.setExternalUserId(record.f0.toString)
    stateChange.setEmail(fixEmail(record.f1.getLoginName.toString))
    new Tuple2(customerId, stateChange)
  }

  override def transformPayload(): String = Flag.CustomerAddressVerified.name

  override def operationTrigger(): String = OperationTrigger.DummyFlow.name

}

object DummyPreJoinLoginConditionalMapper {
  def apply(brand: Brand): DummyPreJoinLoginConditionalMapper = new DummyPreJoinLoginConditionalMapper(brand)
}