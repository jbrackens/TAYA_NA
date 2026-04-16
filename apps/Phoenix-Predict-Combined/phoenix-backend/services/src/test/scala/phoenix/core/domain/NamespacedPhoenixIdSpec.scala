package phoenix.core.domain

import cats.syntax.validated._
import org.scalatest.matchers.must.Matchers
import org.scalatest.prop.TableDrivenPropertyChecks
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.markets.sports.SportEntity.CompetitorId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.TournamentId

class NamespacedPhoenixIdSpec extends AnyWordSpecLike with Matchers with TableDrivenPropertyChecks {

  "NamespacedPhoenixId" should {
    "parse namespaced oddin fixture id successfully" in {
      NamespacedPhoenixId.parse(FixtureId.apply)("f:o:od:match:12345") must ===(
        FixtureId(DataProvider.Oddin, "od:match:12345").valid)
    }

    "parse namespaced oddin tournament id successfully" in {
      NamespacedPhoenixId.parse(TournamentId.apply)("t:o:od:to:12345") must ===(
        TournamentId(DataProvider.Oddin, "od:to:12345").valid)
    }

    "parse namespaced oddin competitor id successfully" in {
      NamespacedPhoenixId.parse(CompetitorId.apply)("c:o:od:competitor:12345") must ===(
        CompetitorId(DataProvider.Oddin, "od:competitor:12345").valid)
    }

    "parse namespaced betgenius fixture id successfully" in {
      NamespacedPhoenixId.parse(FixtureId.apply)("f:b:12345") must ===(FixtureId(DataProvider.Betgenius, "12345").valid)
    }

    "parse namespaced betgenius tournament id successfully" in {
      NamespacedPhoenixId.parse(TournamentId.apply)("t:b:12345") must ===(
        TournamentId(DataProvider.Betgenius, "12345").valid)
    }

    "parse namespaced betgenius competitor id successfully" in {
      NamespacedPhoenixId.parse(CompetitorId.apply)("c:b:12345") must ===(
        CompetitorId(DataProvider.Betgenius, "12345").valid)
    }

    "fail if identifier has invalid syntax" in {
      NamespacedPhoenixId.parse(FixtureId.apply)("f+o:od:match:12345") must ===(
        "Id is not a valid namespaced id: f+o:od:match:12345".invalid)
    }

    "fail if identifier has unknown data provider" in {
      NamespacedPhoenixId.parse(FixtureId.apply)("f:u:od:match:12345") must ===("Provider u is not valid".invalid)
    }

    "fail if parsed identifier has different type than expected" in {
      NamespacedPhoenixId.parse(FixtureId.apply)("t:o:od:match:12345") must ===(
        "Entity prefix 'f' is not valid for provided id: t:o:od:match:12345".invalid)
    }

    "wrap message in an exepction in unsafeParse" in {
      val e = intercept[IllegalArgumentException] {
        NamespacedPhoenixId.unsafeParse(FixtureId.apply)("t:o:od:match:12345")
      }
      e.getMessage must ===("Entity prefix 'f' is not valid for provided id: t:o:od:match:12345")
    }
  }
}
