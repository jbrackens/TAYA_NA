package net.flipsports.gmx.streaming.sbtech

import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}

object SportEventsImplicits {


  object SportEventUpdate {
    import net.flipsports.gmx.streaming.sbtech.SportEventsTypes.SportEventUpdate._

    implicit val key: TypeInformation[KeyType] = TypeExtractor.getForClass(classOf[KeyType])

    implicit val value: TypeInformation[ValueType] = TypeExtractor.getForClass(classOf[ValueType])

    implicit val keyWithValue: TypeInformation[Tuple2[KeyType, ValueType]] = new TupleTypeInfo(classOf[Tuple2[KeyType, ValueType]], key, value)

  }

  object SportEventEvent {
    import net.flipsports.gmx.streaming.sbtech.SportEventsTypes.SportEventEvent._

    implicit val key: TypeInformation[KeyType] = TypeExtractor.getForClass(classOf[KeyType])

    implicit val value: TypeInformation[ValueType] = TypeExtractor.getForClass(classOf[ValueType])

    implicit val keyWithValue: TypeInformation[Tuple2[KeyType, ValueType]] = new TupleTypeInfo(classOf[Tuple2[KeyType, ValueType]], key, value)

  }


  object SportEventMarket {
    import net.flipsports.gmx.streaming.sbtech.SportEventsTypes.SportEventMarket._

    implicit val key: TypeInformation[KeyType] = TypeExtractor.getForClass(classOf[KeyType])

    implicit val value: TypeInformation[ValueType] = TypeExtractor.getForClass(classOf[ValueType])

    implicit val keyWithValue: TypeInformation[Tuple2[KeyType, ValueType]] = new TupleTypeInfo(classOf[Tuple2[KeyType, ValueType]], key, value)

  }

  object SportEventSelection {
    import net.flipsports.gmx.streaming.sbtech.SportEventsTypes.SportEventSelection._

    implicit val key: TypeInformation[KeyType] = TypeExtractor.getForClass(classOf[KeyType])

    implicit val value: TypeInformation[ValueType] = TypeExtractor.getForClass(classOf[ValueType])

    implicit val keyWithValue: TypeInformation[Tuple2[KeyType, ValueType]] = new TupleTypeInfo(classOf[Tuple2[KeyType, ValueType]], key, value)

  }



}