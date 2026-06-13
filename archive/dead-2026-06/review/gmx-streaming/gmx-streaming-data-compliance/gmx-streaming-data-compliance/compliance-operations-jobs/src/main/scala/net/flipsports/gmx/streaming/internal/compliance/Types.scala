package net.flipsports.gmx.streaming.internal.compliance


import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple2}

object Types {

  object WalletTransactions {
    import SBTech.Microservices.DataStreaming.DTO.WalletTransaction.v1.WalletTransactionCustomerId
    import SBTech.Microservices.DataStreaming.DTO.WalletTransaction.v1.WalletTransaction
    type KeyType = WalletTransactionCustomerId
    type ValueType = WalletTransaction
    type Source = FlinkTuple2[KeyType, ValueType]
  }

  object Customer {
    type KeyType = Int
  }

  object DepositAction {
    import net.flipsports.gmx.streaming.internal.compliance.model.{DepositAction, DepositActionKey}
    type KeyType = DepositActionKey
    type StorageKey = String
    type ValueType = DepositAction
    type Source = FlinkTuple2[KeyType, ValueType]
  }

  object Compliance {
    import net.flipsports.gmx.dataapi.internal.compliance.validation.{ComplianceCustomerId, ValidationCheck}
    type KeyType = ComplianceCustomerId
    type ValueType = ValidationCheck
    type Source =  FlinkTuple2[KeyType, ValueType]
  }
}
