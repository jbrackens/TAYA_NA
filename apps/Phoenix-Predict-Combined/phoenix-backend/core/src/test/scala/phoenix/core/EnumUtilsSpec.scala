package phoenix.core

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.EnumUtils.EnumOps

class EnumUtilsSpec extends AnyWordSpecLike with Matchers {

  sealed trait DefaultCaseEnum extends EnumEntry
  object DefaultCaseEnum extends Enum[DefaultCaseEnum] {
    case object FirstEntry extends DefaultCaseEnum
    case object SecondEntry extends DefaultCaseEnum

    override def values: IndexedSeq[DefaultCaseEnum] = findValues
  }

  sealed trait UpperSnakecaseEnum extends EnumEntry with UpperSnakecase
  object UpperSnakecaseEnum extends Enum[UpperSnakecaseEnum] {
    case object FirstEntry extends UpperSnakecaseEnum
    case object SecondEntry extends UpperSnakecaseEnum

    override def values: IndexedSeq[UpperSnakecaseEnum] = findValues
  }

  "withUnderlyingObjectNameOption" should {
    "find enum entry by underlying object name (same as entry name) in case of a default-case enum" in {
      DefaultCaseEnum.withNameOption("FIRST_ENTRY") mustBe None
      DefaultCaseEnum.withNameOption("FirstEntry") mustBe Some(DefaultCaseEnum.FirstEntry)
      DefaultCaseEnum.withUnderlyingObjectNameOption("FIRST_ENTRY") mustBe None
      DefaultCaseEnum.withUnderlyingObjectNameOption("FirstEntry") mustBe Some(DefaultCaseEnum.FirstEntry)
    }

    "find enum entry by underlying object name and NOT by entry name in case of an upper-snakecase enum" in {
      UpperSnakecaseEnum.withNameOption("FIRST_ENTRY") mustBe Some(UpperSnakecaseEnum.FirstEntry)
      UpperSnakecaseEnum.withNameOption("FirstEntry") mustBe None
      UpperSnakecaseEnum.withUnderlyingObjectNameOption("FIRST_ENTRY") mustBe None
      UpperSnakecaseEnum.withUnderlyingObjectNameOption("FirstEntry") mustBe Some(UpperSnakecaseEnum.FirstEntry)
    }
  }
}
