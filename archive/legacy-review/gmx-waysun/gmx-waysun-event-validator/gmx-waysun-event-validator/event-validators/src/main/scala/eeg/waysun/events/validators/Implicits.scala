package eeg.waysun.events.validators

import net.flipsports.gmx.streaming.common.job.streams.dto.{Cache, KeyValue}
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}

object Implicits {

  implicit val projectId: TypeInformation[Types.ProjectId] =
    TypeExtractor.getForClass(classOf[Types.ProjectId])
  implicit val customerId: TypeInformation[Types.CustomerId] =
    TypeExtractor.getForClass(classOf[Types.CustomerId])
  implicit val eventDefinitionId: TypeInformation[Types.EventDefinitionRuleIdId] =
    TypeExtractor.getForClass(classOf[Types.EventDefinitionRuleIdId])

  object DefinitionImplicit {

    implicit val key: TypeInformation[Types.Definition.KeyType] =
      TypeExtractor.getForClass(classOf[Types.Definition.KeyType])

    implicit val sourceKey: TypeInformation[Types.Definition.SourceKeyType] =
      TypeExtractor.getForClass(classOf[Types.Definition.SourceKeyType])

    implicit val value: TypeInformation[Types.Definition.ValueType] =
      TypeExtractor.getForClass(classOf[Types.Definition.ValueType])

    implicit val keyWithValue: TypeInformation[Types.Definition.Source] =
      new TupleTypeInfo(Types.Definition.sourceClass, sourceKey, value)

    implicit val keyed: TypeInformation[Types.Definition.KeyedType] =
      TypeExtractor.getForClass(Types.Definition.keyedClass)

  }

  object RawImplicit {

    implicit val key: TypeInformation[Types.Raw.KeyType] = TypeExtractor.getForClass(classOf[Types.Raw.KeyType])

    implicit val value: TypeInformation[Types.Raw.ValueType] = TypeExtractor.getForClass(classOf[Types.Raw.ValueType])

    implicit val sourceKey: TypeInformation[Types.Raw.SourceKeyType] =
      TypeExtractor.getForClass(Types.Raw.sourceKeyClass)

    implicit val keyWithValue: TypeInformation[Types.Raw.Source] =
      new TupleTypeInfo(Types.Raw.sourceClass, sourceKey, value)

    implicit val keyed: TypeInformation[Types.Raw.KeyedType] = TypeExtractor.getForClass(Types.Raw.keyedClass)

  }

  object CachedImplicit {

    val valueTypeInformation: TypeInformation[Cache[KeyValue[Types.Raw.KeyType, Types.Raw.ValueType]]] =
      TypeInformation.of(classOf[Cache[KeyValue[Types.Raw.KeyType, Types.Raw.ValueType]]])

  }

  object RawWithDefinitionImplicit {

    val keyWithValue: TypeInformation[Types.RawWithDefinition.OutputType] =
      TypeInformation.of(classOf[Types.RawWithDefinition.OutputType])
  }

  object JoiningImplicit {
    implicit val projectId: TypeInformation[Types.ProjectId] =
      TypeInformation.of(Types.projectIdClass)

    implicit val customerId: TypeInformation[Types.CustomerId] =
      TypeInformation.of(Types.customerIdClass)
    implicit val key: TupleTypeInfo[Types.Joining.KeyType] = {
      new TupleTypeInfo[Types.Joining.KeyType](Types.Joining.keyClass, projectId, customerId)
    }
  }

  object RawWithDefinitionKeyImplicit {

    val key: TypeInformation[Types.RawWithDefinitionKey.KeyType] =
      new TupleTypeInfo[Types.RawWithDefinitionKey.KeyType](
        Types.RawWithDefinitionKey.keyClass,
        Implicits.projectId,
        Implicits.customerId)

    val output: TypeInformation[Types.RawWithDefinitionKey.KeyedType] =
      TypeExtractor.getForClass(Types.RawWithDefinitionKey.keyedClass)
  }

  object ValidatedImplicit {

    implicit val key: TypeInformation[Types.Validated.KeyType] =
      TypeExtractor.getForClass(classOf[Types.Validated.KeyType])

    implicit val value: TypeInformation[Types.Validated.ValueType] =
      TypeExtractor.getForClass(classOf[Types.Validated.ValueType])

    implicit val keyWithValue: TypeInformation[Types.Validated.Source] =
      new TupleTypeInfo(Types.Validated.sourceClass, key, value)

  }

  object ValidationFailedImplicit {
    implicit val key: TypeInformation[Types.ValidationFailed.KeyType] =
      TypeExtractor.getForClass(classOf[Types.ValidationFailed.KeyType])

    implicit val value: TypeInformation[Types.ValidationFailed.ValueType] =
      TypeExtractor.getForClass(classOf[Types.ValidationFailed.ValueType])

    implicit val keyWithValue: TypeInformation[Types.ValidationFailed.Source] =
      new TupleTypeInfo(Types.ValidationFailed.sourceClass, key, value)
  }

  object FailedImplicit {

    implicit val key: TypeInformation[Types.Failed.KeyType] =
      TypeExtractor.getForClass(classOf[Types.Failed.KeyType])

    implicit val value: TypeInformation[Types.Failed.ValueType] =
      TypeExtractor.getForClass(classOf[Types.Failed.ValueType])

    implicit val keyWithValue: TypeInformation[Types.Failed.Source] =
      new TupleTypeInfo(Types.Failed.sourceClass, key, value)

  }

}
