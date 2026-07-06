/*
rules = NoEnumToString
 */
package fix

import enumeratum.Enum
import enumeratum.EnumEntry

sealed trait TestEnum extends EnumEntry
object TestEnum extends Enum[TestEnum] {
  def values = findValues

  final case object Case1 extends TestEnum
  final case object Case2 extends TestEnum

  def testToString(input: TestEnum): String = input.toString() // assert: NoEnumToString
  def testOneCaseToString: String = Case1.toString() // assert: NoEnumToString
  def testInterpolation(input: TestEnum): String = s"interpolate test: $input" // assert: NoEnumToString
  def testOneCaseInterpolation: String = s"interpolate test: ${Case1}" // assert: NoEnumToString
  def testGenericToString[T <: TestEnum](input: T): String = input.toString() // assert: NoEnumToString
  def testGenericInterpolation[T <: TestEnum](input: T): String = s"interpolate test: $input" // assert: NoEnumToString
  def testTopToString(input: EnumEntry) = input.toString() // assert: NoEnumToString
  def testTopInterpolate(input: EnumEntry) = s"interpolate test: $input" // assert: NoEnumToString
}
