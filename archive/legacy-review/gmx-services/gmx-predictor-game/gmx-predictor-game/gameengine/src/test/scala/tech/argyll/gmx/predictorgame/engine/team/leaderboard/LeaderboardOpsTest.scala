package tech.argyll.gmx.predictorgame.engine.team.leaderboard

import java.sql.Timestamp
import java.time.LocalDateTime

import org.junit.runner.RunWith
import org.scalatest.FunSuite
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner
import tech.argyll.gmx.predictorgame.Tables.UsersRow

@RunWith(classOf[JUnitRunner])
class LeaderboardOpsTest extends FunSuite {

  private val objectUnderTest = new LeaderboardOps {}

  test("'calculateStandings()' should assign places for scores descending") {
    // given
    val givenScores = Seq(
      createUserWithScore(90, "p1"),
      createUserWithScore(50, "p2"),
      createUserWithScore(70, "p3"),
      createUserWithScore(60, "p4"),
      createUserWithScore(80, "p5"),
      createUserWithScore(10, "p6"),
      createUserWithScore(30, "p7")
    )

    // when
    val actual = objectUnderTest.calculateStandings(givenScores)

    // then
    actual should have size 7

    actual(0)._1 should be(Some(1))
    actual(0)._2.user.name should be("p1")

    actual(1)._1 should be(Some(2))
    actual(1)._2.user.name should be("p5")

    actual(2)._1 should be(Some(3))
    actual(2)._2.user.name should be("p3")

    actual(3)._1 should be(Some(4))
    actual(3)._2.user.name should be("p4")

    actual(4)._1 should be(Some(5))
    actual(4)._2.user.name should be("p2")

    actual(5)._1 should be(Some(6))
    actual(5)._2.user.name should be("p7")

    actual(6)._1 should be(Some(7))
    actual(6)._2.user.name should be("p6")
  }

  test("'calculateStandings()' should handle draw") {
    // given
    val givenScores = Seq(
      createUserWithScore(90, "p1"),
      createUserWithScore(90, "p2"),
      createUserWithScore(80, "p3"),
      createUserWithScore(70, "p4"),
      createUserWithScore(60, "p BB"),
      createUserWithScore(60, "p AA"),
      createUserWithScore(60, "p CC")
    )

    // when
    val actual = objectUnderTest.calculateStandings(givenScores)

    // then
    actual should have size 7

    actual(0)._1 should be(Some(1))
    actual(0)._2.user.name should be("p1")

    actual(1)._1 should be(Some(1))
    actual(1)._2.user.name should be("p2")

    actual(2)._1 should be(Some(3))
    actual(2)._2.user.name should be("p3")

    actual(3)._1 should be(Some(4))
    actual(3)._2.user.name should be("p4")

    actual(4)._1 should be(Some(5))
    actual(4)._2.user.name should be("p AA")

    actual(5)._1 should be(Some(5))
    actual(5)._2.user.name should be("p BB")

    actual(6)._1 should be(Some(5))
    actual(6)._2.user.name should be("p CC")
  }

  test("'calculateStandings()' should exclude not eligible") {
    // given
    val givenScores = Seq(
      createUserWithScore(90, "p1"),
      createUserWithScore(90, "p2", false),
      createUserWithScore(80, "p3", false),
      createUserWithScore(70, "p4"),
      createUserWithScore(60, "p BB", false),
      createUserWithScore(60, "p AA"),
      createUserWithScore(60, "p CC", false)
    )

    // when
    val actual = objectUnderTest.calculateStandings(givenScores)

    // then
    actual should have size 7

    actual(0)._1 should be(Some(1))
    actual(0)._2.user.name should be("p1")

    actual(1)._1 should be(Some(2))
    actual(1)._2.user.name should be("p4")

    actual(2)._1 should be(Some(3))
    actual(2)._2.user.name should be("p AA")

    actual(3)._1 should be(None)
    actual(3)._2.user.name should be("p2")

    actual(4)._1 should be(None)
    actual(4)._2.user.name should be("p3")

    actual(5)._1 should be(None)
    actual(5)._2.user.name should be("p BB")

    actual(6)._1 should be(None)
    actual(6)._2.user.name should be("p CC")
  }

  private def createUserWithScore(score: Int, name: String, eligible: Boolean = true) = {
    UserScore(UsersRow("id", "oidc", None, None, name, Timestamp.valueOf(LocalDateTime.now())), score, eligible)
  }

}
