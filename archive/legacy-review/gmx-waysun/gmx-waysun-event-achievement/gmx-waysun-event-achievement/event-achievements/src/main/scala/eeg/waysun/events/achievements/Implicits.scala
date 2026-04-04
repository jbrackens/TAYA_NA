package eeg.waysun.events.achievements

import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}

object Implicits {

  object DefinitionImplicit {

    implicit val key: TypeInformation[Types.DefinitionType.KeyType] =
      TypeExtractor.getForClass(classOf[Types.DefinitionType.KeyType])

    implicit val value: TypeInformation[Types.DefinitionType.ValueType] =
      TypeExtractor.getForClass(classOf[Types.DefinitionType.ValueType])

    implicit val keyWithValue: TypeInformation[Types.DefinitionType.Source] =
      new TupleTypeInfo(Types.DefinitionType.sourceClass, key, value)

    implicit val stated: TypeInformation[Types.DefinitionType.Stated] =
      TypeExtractor.getForClass(Types.DefinitionType.statedClass)

    implicit val wrapped: TypeInformation[Types.DefinitionType.Wrapped] =
      TypeExtractor.getForClass(Types.DefinitionType.wrappedClass)
  }

  object AggregatedImplicit {

    implicit val key: TypeInformation[Types.AggregatedType.KeyType] =
      TypeExtractor.getForClass(classOf[Types.AggregatedType.KeyType])

    implicit val value: TypeInformation[Types.AggregatedType.ValueType] =
      TypeExtractor.getForClass(classOf[Types.AggregatedType.ValueType])

    implicit val cached: TypeInformation[Types.AggregatedType.Cached] =
      TypeExtractor.getForClass(classOf[Types.AggregatedType.Cached])

    implicit val keyWithValue: TypeInformation[Types.AggregatedType.Source] =
      new TupleTypeInfo(Types.AggregatedType.sourceClass, key, value)

    implicit val wrapped: TypeInformation[Types.AggregatedType.Wrapped] =
      TypeExtractor.getForClass(Types.AggregatedType.wrappedClass)

  }

  object RawWithDefinitionImplicit {

    val key: TypeInformation[Types.JoiningType.AggregationIdType] =
      TypeInformation.of(Types.JoiningType.aggregationIdClass)

    val output: TypeInformation[Types.AggregatedWithDefinitionType.OutputType] =
      TypeInformation.of(Types.AggregatedWithDefinitionType.outputClass)
  }

  object AchievedImplicit {

    implicit val key: TypeInformation[Types.AchievedType.KeyType] =
      TypeExtractor.getForClass(classOf[Types.AchievedType.KeyType])

    implicit val value: TypeInformation[Types.AchievedType.ValueType] =
      TypeExtractor.getForClass(classOf[Types.AchievedType.ValueType])

    implicit val keyWithValue: TypeInformation[Types.AchievedType.Source] =
      new TupleTypeInfo(Types.AchievedType.sourceClass, key, value)

  }

  object AchievementStateImplicit {

    val key: TypeInformation[Types.AchievementStateType.KeyType] =
      TypeExtractor.getForClass(Types.AchievementStateType.keyClass)

    val value: TypeInformation[Types.AchievementStateType.ValueType] =
      TypeExtractor.getForClass(Types.AchievementStateType.valueClass)
  }

  object JoiningImplicit {
    implicit val key: TypeInformation[Types.JoiningType.AggregationIdType] =
      TypeExtractor.getForClass(classOf[Types.JoiningType.AggregationIdType])
  }
}
