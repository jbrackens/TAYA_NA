package net.flipsports.gmx.streaming.internal.customers.operation.split

import net.flipsports.gmx.streaming.internal.customers.operation.StateChangeImplicits.JoinedCustomerDetailWithLoginsImplicit
import net.flipsports.gmx.streaming.internal.customers.operation.Types
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.scala.OutputTag


object OutputTags {

    val registrationAbuse = OutputTag[Tuple2[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType]]("country-registration-abuse")(JoinedCustomerDetailWithLoginsImplicit.keyWithValue)

}
