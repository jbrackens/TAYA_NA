package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1

import net.flipsports.gmx.streaming.internal.customers.operation.Types
import org.apache.flink.api.common.functions.MapFunction
import org.apache.flink.api.java.tuple.Tuple2

class CustomerIdRecordMapper extends MapFunction[Tuple2[Types.CustomerDetail.KeyType, Types.CustomerDetail.ValueType], Tuple2[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType]] {
  override def map(record: Tuple2[Types.CustomerDetail.KeyType, Types.CustomerDetail.ValueType]): Tuple2[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType] =
    new Tuple2[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType](record.f1.getCustomerID, record.f1)
}
object CustomerIdRecordMapper {

  def apply() = new CustomerIdRecordMapper()
}
