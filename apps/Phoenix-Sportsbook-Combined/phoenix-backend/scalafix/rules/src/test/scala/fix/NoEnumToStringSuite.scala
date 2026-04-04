package fix

import org.scalatest.FunSpecLike
import scalafix.testkit.AbstractSemanticRuleSuite

class NoEnumToStringSuite extends AbstractSemanticRuleSuite with FunSpecLike {
  runAllTests()
}
