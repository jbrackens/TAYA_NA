package net.flipsports.gmx.streaming.internal.customers.operation

import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}

object StateChangeImplicits {

  object CustomerDetailsImplicit {

    implicit val key: TypeInformation[Types.CustomerDetail.KeyType] = TypeExtractor.getForClass(classOf[Types.CustomerDetail.KeyType])

    implicit val value: TypeInformation[Types.CustomerDetail.ValueType] = TypeExtractor.getForClass(classOf[Types.CustomerDetail.ValueType])

    implicit val keyWithValue: TypeInformation[Tuple2[Types.CustomerDetail.KeyType, Types.CustomerDetail.ValueType]] =
      new TupleTypeInfo(classOf[Tuple2[Types.CustomerDetail.KeyType, Types.CustomerDetail.ValueType]], key, value)

  }

  object LoginsImplicit {

    implicit val key: TypeInformation[Types.Logins.KeyType] = TypeExtractor.getForClass(classOf[Types.Logins.KeyType])

    implicit val value: TypeInformation[Types.Logins.ValueType] = TypeExtractor.getForClass(classOf[Types.Logins.ValueType])

    implicit val keyWithValue: TypeInformation[Tuple2[Types.Logins.KeyType, Types.Logins.ValueType]] = new TupleTypeInfo(classOf[Tuple2[Types.Logins.KeyType, Types.Logins.ValueType]], key, value)
  }

  object PreJoinImplicit {
    implicit val key: TypeInformation[Types.PreJoin.KeyType] = TypeInformation.of(classOf[Types.PreJoin.KeyType])

    object CustomerDetails {
      implicit val keyWithValue: TypeInformation[Tuple2[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType]] =
        new TupleTypeInfo(classOf[Tuple2[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType]], PreJoinImplicit.key, CustomerDetailsImplicit.value)
    }

    object Logins {
      implicit val keyWithValue: TypeInformation[Tuple2[Types.PreJoin.KeyType, Types.Logins.ValueType]] =
        new TupleTypeInfo(classOf[Tuple2[Types.PreJoin.KeyType, Types.Logins.ValueType]], PreJoinImplicit.key, LoginsImplicit.value)
    }
  }

  object JoinedCustomerDetailWithLoginsImplicit {
    implicit val key: TypeInformation[Types.JoinedCustomerDetailWithLogins.KeyType] = TypeInformation.of(classOf[Types.JoinedCustomerDetailWithLogins.KeyType])
    implicit val value: TypeInformation[Types.JoinedCustomerDetailWithLogins.ValueType] = TypeInformation.of(classOf[Types.JoinedCustomerDetailWithLogins.ValueType])
    implicit val keyWithValue: TypeInformation[Tuple2[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType]] =
      new TupleTypeInfo(classOf[Tuple2[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType]], key, value)
  }

  object StateChangeimplicit {

    implicit val key: TypeInformation[Types.CustomerStateChange.KeyType] = TypeExtractor.getForClass(classOf[Types.CustomerStateChange.KeyType])

    implicit val value: TypeInformation[Types.CustomerStateChange.ValueType] = TypeExtractor.getForClass(classOf[Types.CustomerStateChange.ValueType])

    implicit val keyWithValue: TypeInformation[Tuple2[Types.CustomerStateChange.KeyType, Types.CustomerStateChange.ValueType]] = new TupleTypeInfo(classOf[Tuple2[Types.CustomerStateChange.KeyType, Types.CustomerStateChange.ValueType]], key, value)

  }
}
