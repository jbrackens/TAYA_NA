package gmx.service.responsiblegambling.generators

import org.scalatest._
import org.scalatest.matchers._
import org.scalatest.wordspec.AnyWordSpec

abstract class UnitSpec extends AnyWordSpec with should.Matchers with OptionValues with Inside with Inspectors {}
