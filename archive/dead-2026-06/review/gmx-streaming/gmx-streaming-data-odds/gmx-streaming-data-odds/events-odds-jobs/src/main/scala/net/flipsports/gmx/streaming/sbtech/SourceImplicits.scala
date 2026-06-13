package net.flipsports.gmx.streaming.sbtech

import net.flipsports.gmx.streaming.sbtech.dto.Id
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}


object SourceImplicits {

  object Event {
    import net.flipsports.gmx.streaming.sbtech.SourceTypes.Event._

    implicit val key: TypeInformation[KeyType] = TypeExtractor.getForClass(classOf[KeyType])

    implicit val value: TypeInformation[ValueType] = TypeExtractor.getForClass(classOf[ValueType])

    implicit val keyWithValue: TupleTypeInfo[Tuple2[KeyType, ValueType]] = new TupleTypeInfo(classOf[Tuple2[KeyType, ValueType]], key, value)
  }

  object Market {
    import net.flipsports.gmx.streaming.sbtech.SourceTypes.Market._

    implicit val key: TypeInformation[KeyType] = TypeExtractor.getForClass(classOf[KeyType])

    implicit val value: TypeInformation[ValueType] = TypeExtractor.getForClass(classOf[ValueType])

    implicit val keyWithValue: TupleTypeInfo[Tuple2[KeyType, ValueType]] = new TupleTypeInfo(classOf[Tuple2[KeyType, ValueType]], key, value)
  }

  object Selection {
    import net.flipsports.gmx.streaming.sbtech.SourceTypes.Selection._

    implicit val key: TypeInformation[KeyType] = TypeExtractor.getForClass(classOf[KeyType])

    implicit val value: TypeInformation[ValueType] = TypeExtractor.getForClass(classOf[ValueType])

    implicit val keyWithValue: TupleTypeInfo[Tuple2[KeyType, ValueType]] = new TupleTypeInfo(classOf[Tuple2[KeyType, ValueType]], key, value)
   }

  object Odds {

    import net.flipsports.gmx.streaming.sbtech.SourceTypes.Odds._

    implicit val id: TypeInformation[Id] = TypeExtractor.getForClass(classOf[Id])

    implicit val keyWithValue: TypeInformation[Source] = TypeExtractor.getForClass(classOf[Source])
  }
}
