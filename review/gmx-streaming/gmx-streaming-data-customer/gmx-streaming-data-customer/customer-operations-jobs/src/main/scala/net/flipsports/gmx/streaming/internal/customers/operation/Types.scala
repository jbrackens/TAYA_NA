package net.flipsports.gmx.streaming.internal.customers.operation

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.CustomerDetailCustomerId
import SBTech.Microservices.DataStreaming.DTO.Login.v1.LoginCustomerId
import net.flipsports.gmx.dataapi.internal.customers.operations.StraightValue
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.scala.DataStream

object Types {

  object CustomerDetail {
    import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.CustomerDetail
    type KeyType = CustomerDetailCustomerId
    type ValueType = CustomerDetail
    type Source = Tuple2[KeyType, ValueType]
  }

  object Logins {
    import SBTech.Microservices.DataStreaming.DTO.Login.v1.Login
    type KeyType = LoginCustomerId
    type ValueType = Login
    type Source = Tuple2[KeyType, ValueType]
  }

  object PreJoin {
    type KeyType = Int
  }

  object JoinedCustomerDetailWithLogins {
    import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.dto.CustomerWithLogin
    type KeyType = PreJoin.KeyType
    type ValueType = CustomerWithLogin

    type Source = Tuple2[KeyType, ValueType]
  }

  object CustomerStateChange {
    import net.flipsports.gmx.dataapi.internal.customers.operations.{CustomerOperationId, StateChange}
    type KeyType = CustomerOperationId
    type ValueType = StateChange
    type PayloadType = StraightValue

    type Source = Tuple2[KeyType, ValueType]
  }


  object Streams {
    type CustomerStream = DataStream[CustomerDetail.Source]
    type LoginStream = DataStream[Logins.Source]
    type PreJoinCustomerStream = DataStream[Tuple2[PreJoin.KeyType, CustomerDetail.ValueType]]
    type PreJoinLoginStream = DataStream[Tuple2[PreJoin.KeyType, Logins.ValueType]]
    type CustomerLoginStream = DataStream[JoinedCustomerDetailWithLogins.Source]
    type StateChangeStream = DataStream[Tuple2[CustomerStateChange.KeyType, CustomerStateChange.ValueType]]
  }
}
