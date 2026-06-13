package net.flipsports.gmx.streaming.internal.compliance

import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}

object Implicits {

  object WalletTransactionsImplicit {

    implicit val key: TypeInformation[Types.WalletTransactions.KeyType] = TypeExtractor.getForClass(classOf[Types.WalletTransactions.KeyType])

    implicit val value: TypeInformation[Types.WalletTransactions.ValueType] = TypeExtractor.getForClass(classOf[Types.WalletTransactions.ValueType])

    implicit val keyWithValue: TypeInformation[Tuple2[Types.WalletTransactions.KeyType, Types.WalletTransactions.ValueType]] = new TupleTypeInfo(classOf[Tuple2[Types.WalletTransactions.KeyType, Types.WalletTransactions.ValueType]], key, value)
  }

  object Customer {
    implicit val key: TypeInformation[Types.Customer.KeyType] = TypeExtractor.getForClass(classOf[Types.Customer.KeyType])
  }

  object DepositAction {
    implicit val value: TypeInformation[Types.DepositAction.ValueType] = TypeExtractor.getForClass(classOf[Types.DepositAction.ValueType])
    implicit val key: TypeInformation[Types.DepositAction.StorageKey] = TypeExtractor.getForClass(classOf[Types.DepositAction.StorageKey])
  }

  object ComplianceImplicit {
    implicit val key: TypeInformation[Types.Compliance.KeyType] = TypeExtractor.getForClass(classOf[Types.Compliance.KeyType])

    implicit val value: TypeInformation[Types.Compliance.ValueType] = TypeExtractor.getForClass(classOf[Types.Compliance.ValueType])

    implicit val keyWithValue: TypeInformation[Tuple2[Types.Compliance.KeyType, Types.Compliance.ValueType]] = new TupleTypeInfo(classOf[Tuple2[Types.Compliance.KeyType, Types.Compliance.ValueType]], key, value)

  }
}
