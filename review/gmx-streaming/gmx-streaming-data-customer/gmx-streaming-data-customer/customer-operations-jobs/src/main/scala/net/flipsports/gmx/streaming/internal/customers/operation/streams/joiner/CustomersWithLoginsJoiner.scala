package net.flipsports.gmx.streaming.internal.customers.operation.streams.joiner

import net.flipsports.gmx.streaming.internal.customers.operation.Types.{CustomerDetail, JoinedCustomerDetailWithLogins, Logins, PreJoin}
import org.apache.flink.api.common.functions.JoinFunction
import org.apache.flink.api.java.tuple.Tuple2

class CustomersWithLoginsJoiner extends JoinFunction[Tuple2[PreJoin.KeyType, CustomerDetail.ValueType], Tuple2[PreJoin.KeyType, Logins.ValueType], Tuple2[JoinedCustomerDetailWithLogins.KeyType, JoinedCustomerDetailWithLogins.ValueType]] {
  override def join(first: Tuple2[PreJoin.KeyType, CustomerDetail.ValueType], second: Tuple2[PreJoin.KeyType, Logins.ValueType]): Tuple2[JoinedCustomerDetailWithLogins.KeyType, JoinedCustomerDetailWithLogins.ValueType] = {
    new Tuple2(first.f0, new JoinedCustomerDetailWithLogins.ValueType(first.f1, second.f1))
  }
}

object CustomersWithLoginsJoiner {

  def apply(): CustomersWithLoginsJoiner = new CustomersWithLoginsJoiner()
}