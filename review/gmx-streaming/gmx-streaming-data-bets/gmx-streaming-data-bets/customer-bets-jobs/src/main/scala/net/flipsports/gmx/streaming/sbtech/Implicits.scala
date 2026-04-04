package net.flipsports.gmx.streaming.sbtech


import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}

object Implicits {

  object SportBets {
    implicit val value: TypeInformation[Types.SportBets.ValueType] = TypeExtractor.getForClass(classOf[Types.SportBets.ValueType])

    implicit val key: TypeInformation[Types.SportBets.KeyType] = TypeExtractor.getForClass(classOf[Types.SportBets.KeyType])

    implicit val keyWithValue : TupleTypeInfo[FlinkTuple[Types.SportBets.KeyType, Types.SportBets.ValueType]] = new TupleTypeInfo(classOf[FlinkTuple[Types.SportBets.KeyType, Types.SportBets.ValueType]], value, value)
  }

  object CasinoBets {
    implicit val value: TypeInformation[Types.CasinoBets.ValueType] = TypeExtractor.getForClass(classOf[Types.CasinoBets.ValueType])

    implicit val key: TypeInformation[Types.CasinoBets.KeyType] = TypeExtractor.getForClass(classOf[Types.CasinoBets.KeyType])

    implicit val keyWithValue : TupleTypeInfo[FlinkTuple[Types.CasinoBets.KeyType, Types.CasinoBets.ValueType]] = new TupleTypeInfo(classOf[FlinkTuple[Types.CasinoBets.KeyType, Types.CasinoBets.ValueType]], value, value)
  }

  object Bets {
    implicit val value: TypeInformation[Types.Bets.ValueType] = TypeExtractor.getForClass(classOf[Types.Bets.ValueType])

    implicit val key: TypeInformation[Types.Bets.KeyType] = TypeExtractor.getForClass(classOf[Types.Bets.KeyType])

    implicit val keyWithValue : TupleTypeInfo[FlinkTuple[Types.Bets.KeyType, Types.Bets.ValueType]] = new TupleTypeInfo(classOf[FlinkTuple[Types.Bets.KeyType, Types.Bets.ValueType]], value, value)

  }

  object Topups {
    implicit val key: TypeInformation[Types.Topup.Key] = TypeExtractor.getForClass(classOf[Types.Topup.Key])

    implicit val value: TypeInformation[Types.Topup.Value] = TypeExtractor.getForClass(classOf[Types.Topup.Value])

    implicit val keyWithValue: TupleTypeInfo[FlinkTuple[Types.Topup.Key, Types.Topup.Value]] = new TupleTypeInfo(classOf[FlinkTuple[Types.Topup.Key, Types.Topup.Value]], key, value)

  }


}
