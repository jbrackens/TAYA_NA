package stella.events.gen

import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Date

import org.scalacheck.Arbitrary
import org.scalacheck.Gen

import stella.common.http.jwt.PermissionsCollection
import stella.common.http.jwt.StellaAuthContext
import stella.dataapi.platformevents.Source
import stella.dataapi.validators.FieldType

import stella.events.http.routes.json.Field
import stella.events.http.routes.json.IncomingAdminEvent
import stella.events.http.routes.json.IncomingEvent

object Generators {

  lazy val genOffsetDateTime: Gen[OffsetDateTime] =
    Gen.choose(min = 1, max = System.currentTimeMillis()).flatMap { timestamp =>
      OffsetDateTime.ofInstant(new Date(timestamp).toInstant, ZoneOffset.UTC)
    }

  lazy val incomingEventGen: Gen[IncomingEvent] =
    for {
      messageOriginDateUTC <- genOffsetDateTime
      eventName <- stringGen()
      eventPayload <- eventPayloadGen
    } yield IncomingEvent(messageOriginDateUTC, eventName, eventPayload)

  lazy val incomingAdminEventGen: Gen[IncomingAdminEvent] =
    for {
      messageOriginDateUTC <- genOffsetDateTime
      eventName <- stringGen()
      eventPayload <- eventPayloadGen
      source <- Gen.option(sourceGen)
      onBehalfOfProjectId <- Gen.option(Gen.uuid)
      onBehalfOfUserId <- Gen.option(stringGen())
    } yield IncomingAdminEvent(
      messageOriginDateUTC,
      eventName,
      eventPayload,
      source,
      onBehalfOfProjectId,
      onBehalfOfUserId)

  lazy val eventPayloadGen: Gen[List[Field]] = Gen.listOf(eventFieldGen)

  lazy val eventFieldGen: Gen[Field] =
    for {
      fieldName <- stringGen()
      fieldValueType <- fieldValueTypeGen
      fieldValue <- fieldValueForType(fieldValueType)
    } yield Field(fieldName, fieldValue)

  lazy val fieldValueTypeGen: Gen[FieldType] = Gen.oneOf(FieldType.values)

  def fieldValueForType(fieldType: FieldType): Gen[String] = fieldType match {
    case FieldType.Boolean => Arbitrary.arbBool.arbitrary.map(_.toString)
    case FieldType.String  => stringGen()
    case FieldType.Integer => Arbitrary.arbBigInt.arbitrary.map(_.toString())
    case FieldType.Float   => Arbitrary.arbBigDecimal.arbitrary.map(_.bigDecimal.toPlainString())
  }

  lazy val authContextGen: Gen[StellaAuthContext] =
    for {
      permissions <- permissionsCollectionGen
      userId <- Gen.uuid
      primaryProjectId <- Arbitrary.arbUuid.arbitrary
      additionalProjectIds <- Gen.listOf(Arbitrary.arbUuid.arbitrary).map(_.toSet)
    } yield StellaAuthContext(permissions, userId, primaryProjectId, additionalProjectIds)

  lazy val sourceGen: Gen[Source] = Gen.oneOf(Source.values().toSeq)

  lazy val permissionsCollectionGen: Gen[PermissionsCollection] =
    for {
      permissions <- Gen.listOf(stringGen())
    } yield PermissionsCollection(permissions.toSet)

  def stringGen(maxSize: Int = 32, minSize: Int = 0): Gen[String] =
    Gen.choose(min = minSize, max = maxSize).flatMap { size =>
      Gen.stringOfN(size, Gen.alphaNumChar)
    }

}
