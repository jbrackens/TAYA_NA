package tech.argyll.gmx.predictorgame.services.leaderboard

import org.junit.runner.RunWith
import org.scalatest.FunSuite
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner

@RunWith(classOf[JUnitRunner])
class LeaderboardOpsTest extends FunSuite {

  private val objectUnderTest = new LeaderboardOps {}

  test("'pickTop()' should limit results") {
    // given
    val givenStandings = List(
      LeaderboardEntry("anyId", "p1", 0, 0, 0, Some(1), false, Nil),
      LeaderboardEntry("anyId", "p2", 0, 0, 0, Some(2), false, Nil),
      LeaderboardEntry("anyId", "p3", 0, 0, 0, Some(3), false, Nil),
      LeaderboardEntry("anyId", "p4", 0, 0, 0, Some(4), false, Nil),
      LeaderboardEntry("anyId", "p5", 0, 0, 0, Some(5), false, Nil),
      LeaderboardEntry("anyId", "p5", 0, 0, 0, Some(6), false, Nil)
    )

    // when
    val actual = objectUnderTest.pickTop(givenStandings, 3)

    // then
    actual should have size 3

    actual(0).userName should be("p1")
    actual(1).userName should be("p2")
    actual(2).userName should be("p3")
  }

  test("'pickTop()' should handle draw") {
    // given
    val givenStandings = List(
      LeaderboardEntry("anyId", "p1", 0, 0, 0, Some(1), false, Nil),
      LeaderboardEntry("anyId", "p2", 0, 0, 0, Some(2), false, Nil),
      LeaderboardEntry("anyId", "p3", 0, 0, 0, Some(2), false, Nil),
      LeaderboardEntry("anyId", "p4", 0, 0, 0, Some(4), false, Nil),
      LeaderboardEntry("anyId", "p5", 0, 0, 0, Some(5), false, Nil),
      LeaderboardEntry("anyId", "p6", 0, 0, 0, Some(5), false, Nil),
      LeaderboardEntry("anyId", "p7", 0, 0, 0, Some(5), false, Nil),
      LeaderboardEntry("anyId", "p8", 0, 0, 0, Some(6), false, Nil)
    )

    // when
    val actual = objectUnderTest.pickTop(givenStandings, 5)

    // then
    actual should have size 5

    actual(0).userName should be("p1")
    actual(1).userName should be("p2")
    actual(2).userName should be("p3")
    actual(3).userName should be("p4")
    actual(4).userName should be("p5")
  }

  test("'pickTop()' should add current user") {
    // given
    val givenStandings = List(
      LeaderboardEntry("anyId", "p1", 0, 0, 0, Some(1), false, Nil),
      LeaderboardEntry("anyId", "p2", 0, 0, 0, Some(2), false, Nil),
      LeaderboardEntry("anyId", "p3", 0, 0, 0, Some(2), false, Nil),
      LeaderboardEntry("anyId", "p4", 0, 0, 0, Some(4), false, Nil),
      LeaderboardEntry("anyId", "p5", 0, 0, 0, Some(5), false, Nil),
      LeaderboardEntry("anyId", "p6", 0, 0, 0, Some(5), false, Nil),
      LeaderboardEntry("anyId", "p7", 0, 0, 0, Some(5), false, Nil),
      LeaderboardEntry("anyId", "p8", 0, 0, 0, Some(6), true, Nil)
    )

    // when
    val actual = objectUnderTest.pickTop(givenStandings, 4)

    // then
    actual should have size 4

    actual(0).userName should be("p1")
    actual(1).userName should be("p2")
    actual(2).userName should be("p3")
    actual(3).userName should be("p8")
  }

  test("'pickTop()' should handle empty place") {
    // given
    val givenStandings = List(
      LeaderboardEntry("anyId", "p1", 0, 0, 0, Some(1), false, Nil),
      LeaderboardEntry("anyId", "p2", 0, 0, 0, Some(2), false, Nil),
      LeaderboardEntry("anyId", "p3", 0, 0, 0, None, true, Nil)
    )

    // when
    val actual = objectUnderTest.pickTop(givenStandings, 2)

    // then
    actual should have size 2

    actual(0).userName should be("p1")
    actual(1).userName should be("p3")
  }

  test("'pickTop()' should handle short standing") {
    // given
    val givenStandings = List(
      LeaderboardEntry("anyId", "p1", 0, 0, 0, Some(1), false, Nil),
      LeaderboardEntry("anyId", "p2", 0, 0, 0, Some(2), false, Nil)
    )

    // when
    val actual = objectUnderTest.pickTop(givenStandings, 4)

    // then
    actual should have size 2

    actual(0).userName should be("p1")
    actual(1).userName should be("p2")
  }

}
