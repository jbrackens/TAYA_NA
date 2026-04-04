package phoenix.core.serialization
import io.circe.Codec
import io.circe.Decoder
import io.circe.Encoder
import io.circe.Json
import io.circe.generic.semiauto.deriveCodec
import io.circe.syntax._
import org.scalatest.matchers.should
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.serialization.CirceMigration.AddRequiredField
import phoenix.core.serialization.CirceMigration.ChangeOptionalToRequired
import phoenix.core.serialization.CirceMigration.RenameField

class CirceMigrationsSpec extends AnyWordSpecLike with should.Matchers {

  "Migrating with Circe" should {
    "support migration".that {
      "adds a required field" in {
        case class AddFieldBefore(a: Int)
        case class AddFieldAfter(a: Int, b: Int)

        implicit val migration: CirceMigrations[AddFieldAfter] =
          CirceMigrations(AddRequiredField("b", Json.fromInt(10)))

        implicit val before: Codec[AddFieldBefore] = deriveCodec
        implicit val after: Codec[AddFieldAfter] = deriveCodecWithMigrations

        transcode[AddFieldBefore, AddFieldAfter](AddFieldBefore(4)) should equal(AddFieldAfter(4, 10))
        transcode[AddFieldAfter, AddFieldAfter](AddFieldAfter(5, 4)) should equal(AddFieldAfter(5, 4))
      }

      "renames a field" in {
        case class RenameFieldBefore(a: Int, a1: Option[Int])
        case class RenameFieldAfter(b: Int, b1: Option[Int])

        implicit val migration: CirceMigrations[RenameFieldAfter] =
          CirceMigrations(RenameField("a", "b"), RenameField("a1", "b1"))

        implicit val before: Codec[RenameFieldBefore] = deriveCodec
        implicit val after: Codec[RenameFieldAfter] = deriveCodecWithMigrations

        transcode[RenameFieldBefore, RenameFieldAfter](RenameFieldBefore(4, None)) should equal(
          RenameFieldAfter(4, None))
        transcode[RenameFieldBefore, RenameFieldAfter](RenameFieldBefore(4, Some(2))) should equal(
          RenameFieldAfter(4, Some(2)))
      }

      "changes optional to required" in {
        case class OptionalToRequiredBefore(a: Option[Int])
        case class OptionalToRequiredAfter(a: Int)

        implicit val migration: CirceMigrations[OptionalToRequiredAfter] =
          CirceMigrations(ChangeOptionalToRequired("a", Json.fromInt(10)))

        implicit val before: Codec[OptionalToRequiredBefore] = deriveCodec
        implicit val after: Codec[OptionalToRequiredAfter] = deriveCodecWithMigrations

        transcode[OptionalToRequiredBefore, OptionalToRequiredAfter](OptionalToRequiredBefore(Some(5))) should equal(
          OptionalToRequiredAfter(5))
        transcode[OptionalToRequiredBefore, OptionalToRequiredAfter](OptionalToRequiredBefore(None)) should equal(
          OptionalToRequiredAfter(10))
      }

      "has multiple steps" in {
        case class StringHolder(value: String)

        case class AddFieldClass()
        case class ChangeTypeClass(a: String)
        case class RenameFieldClass(a: StringHolder)
        case class FinalClass(holder: StringHolder)

        val changeTypeMigration: CirceMigration = _.downField("a").withFocus { json =>
          Json.fromFields(Map("value" -> json))
        }.up

        implicit val migration: CirceMigrations[FinalClass] =
          CirceMigrations(
            AddRequiredField("a", Json.fromString("default")),
            changeTypeMigration,
            RenameField("a", "holder"))

        implicit val holder: Codec[StringHolder] = deriveCodec

        implicit val codec1: Codec[AddFieldClass] = deriveCodec
        implicit val codec2: Codec[ChangeTypeClass] = deriveCodec
        implicit val codec3: Codec[RenameFieldClass] = deriveCodec
        implicit val codec4: Codec[FinalClass] = deriveCodecWithMigrations

        val trans1 = transcode[AddFieldClass, FinalClass](AddFieldClass())
        trans1 should equal(FinalClass(StringHolder("default")))

        val trans2 = transcodeWithVersion[ChangeTypeClass, FinalClass](1, ChangeTypeClass("value"))
        trans2 should equal(FinalClass(StringHolder("value")))

        val trans3 =
          transcodeWithVersion[RenameFieldClass, FinalClass](2, RenameFieldClass(StringHolder("holder-value")))
        trans3 should equal(FinalClass(StringHolder("holder-value")))

        val original = FinalClass(StringHolder("noop"))
        val trans4 = transcode[FinalClass, FinalClass](original)
        trans4 should equal(original)
      }
    }

    "allow removing, changing to optional and adding optional field without any configuration" in {
      case class BeforeMigration(toRemove: String, toMakeOptional: String)
      case class AfterMigration(toMakeOptional: Option[String], toAddOptional: Option[String])

      implicit val codec1: Codec[BeforeMigration] = deriveCodec
      implicit val codec2: Codec[AfterMigration] = deriveCodec

      val trans1 = transcode[BeforeMigration, AfterMigration](BeforeMigration("to-remove", "make-optional"))
      trans1 should equal(AfterMigration(Some("make-optional"), None))

      val original = AfterMigration(Some("test"), Some("test"))
      val trans2 = transcode[AfterMigration, AfterMigration](original)
      trans2 should equal(original)

    }
  }

  private def transcode[A: Encoder, B: Decoder](in: A): B = {
    in.asJson.as[B] match {
      case Left(value)  => throw value
      case Right(value) => value
    }
  }

  private def transcodeWithVersion[A: Encoder, B: Decoder](version: Int, in: A): B = {
    in.asJson.mapObject(_.add(CirceMigrations.versionFieldName, Json.fromInt(version))).as[B] match {
      case Left(value)  => throw value
      case Right(value) => value
    }
  }
}
