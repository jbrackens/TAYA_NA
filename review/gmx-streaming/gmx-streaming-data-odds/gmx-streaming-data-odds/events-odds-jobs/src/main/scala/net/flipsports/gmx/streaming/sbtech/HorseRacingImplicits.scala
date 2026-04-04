package net.flipsports.gmx.streaming.sbtech

import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}

object HorseRacingImplicits {

  object Event {
    import net.flipsports.gmx.streaming.sbtech.HorseRacingTypes.Event._

    implicit val key: TypeInformation[KeyType] = TypeExtractor.getForClass(classOf[KeyType])

    implicit val value: TypeInformation[ValueType] = TypeExtractor.getForClass(classOf[ValueType])

    implicit val keyWithValue: TypeInformation[Tuple2[KeyType, ValueType]] = new TupleTypeInfo(classOf[Tuple2[KeyType, ValueType]], key, value)

  }

  object EventUpdate {
    import net.flipsports.gmx.streaming.sbtech.HorseRacingTypes.EventUpdate._

    implicit val key: TypeInformation[KeyType] = TypeExtractor.getForClass(classOf[KeyType])

    implicit val value: TypeInformation[ValueType] = TypeExtractor.getForClass(classOf[ValueType])

    implicit val keyWithValue: TypeInformation[Tuple2[KeyType, ValueType]] = new TupleTypeInfo(classOf[Tuple2[KeyType, ValueType]], key, value)

  }

  object MarketUpdate {
    import net.flipsports.gmx.streaming.sbtech.HorseRacingTypes.MarketUpdate._

    implicit val key: TypeInformation[KeyType] = TypeExtractor.getForClass(classOf[KeyType])

    implicit val value: TypeInformation[ValueType] = TypeExtractor.getForClass(classOf[ValueType])

    implicit val keyWithValue: TypeInformation[Tuple2[KeyType, ValueType]] = new TupleTypeInfo(classOf[Tuple2[KeyType, ValueType]], key, value)

  }

  object SelectionUpdate {
    import net.flipsports.gmx.streaming.sbtech.HorseRacingTypes.SelectionUpdate._

    implicit val key: TypeInformation[KeyType] = TypeExtractor.getForClass(classOf[KeyType])

    implicit val value: TypeInformation[ValueType] = TypeExtractor.getForClass(classOf[ValueType])

    implicit val keyWithValue: TypeInformation[Tuple2[KeyType, ValueType]] = new TupleTypeInfo(classOf[Tuple2[KeyType, ValueType]], key, value)

  }
}