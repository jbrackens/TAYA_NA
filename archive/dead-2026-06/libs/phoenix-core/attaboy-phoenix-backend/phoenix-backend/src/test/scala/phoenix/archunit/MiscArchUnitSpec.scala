package phoenix.archunit

import com.tngtech.archunit.base.DescribedPredicate.not
import com.tngtech.archunit.core.domain.JavaCall.Predicates.target
import com.tngtech.archunit.core.domain.JavaClass.Predicates.assignableTo
import com.tngtech.archunit.core.domain.JavaClass.Predicates.equivalentTo
import com.tngtech.archunit.core.domain._
import com.tngtech.archunit.core.domain.properties.HasName.Predicates.nameMatching
import com.tngtech.archunit.core.domain.properties.HasOwner.Predicates.With.owner
import com.tngtech.archunit.lang.ArchCondition
import com.tngtech.archunit.lang.ConditionEvents
import com.tngtech.archunit.lang.SimpleConditionEvent
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.archunit.BaseArchUnitSpec.importedProductionClasses
import phoenix.archunit.BaseArchUnitSpec.importedTestClasses
import phoenix.core.OptionUtils
import phoenix.core.ScalaObjectUtils.ScalaObjectOps
import phoenix.core.SeqUtils
import phoenix.core.persistence.ExtendedPostgresProfile

class MiscArchUnitSpec extends AnyWordSpecLike with BaseArchUnitSpec {

  "Classes" should {

    // Note: I've tried scalafix-noinfer (http://eed3si9n.com/stricter-scala-with-xlint-xfatal-warnings-and-scalafix/)
    // and -Ynolub (http://eed3si9n.com/stricter-scala-with-ynolub/)
    // for that purpose, but neither works under Scala 2.13.
    "never call contains(...) but call invariantContains(...) instead for type safety" in {
      noClasses.that
        .areNotAssignableTo(classOf[OptionUtils.OptionOps[_]])
        .and
        .areNotAssignableTo(classOf[SeqUtils.SeqOps[_]])
        .should
        .callMethodWhere {
          target {
            owner {
              assignableTo(classOf[Option[_]]).or(assignableTo(classOf[Seq[_]]))
            }
          } and target {
            nameMatching("contains")
          }
        }
        .because(
          "`List(1,2,3).contains(\"hello\")` is valid Scala code - param of `contains` is of type `A1 >: A` and not just `A`. " +
          "This leads to hard-to-track bugs. " +
          s"Use `invariantContains` from ${classOf[OptionUtils.OptionOps[_]].getName} or ${classOf[SeqUtils.SeqOps[_]].getName} " +
          "to make sure that the provided element conforms to the type of collection's elements.")
        .check(importedProductionClasses)
    }

    "never call EitherT.pure/rightT but call EitherT.safeRightT instead for race-condition safety" in {
      noClasses.should
        .callMethodWhere {
          target {
            owner {
              equivalentTo(cats.data.EitherT.getClass)
            }
          } and target {
            nameMatching("pure").or(nameMatching("rightT"))
          }
        }
        .because(s"EitherT.safeRightT (see ${phoenix.core.EitherTUtils.objectName}) should be used instead, " +
        s"since EitherT.pure/rightT does not protect against passing a Future as a parameter, " +
        s"which leaves the Future dangling and can lead to a race condition")
        .checkAll(importedProductionClasses, importedTestClasses)
    }

    "never call println(...)" in {
      noClasses.should
        .callMethodWhere {
          target {
            owner {
              equivalentTo(scala.Predef.getClass)
            }
          } and target {
            nameMatching("println")
          }
        }
        .checkAll(importedProductionClasses, importedTestClasses)
    }

    "never depend on PostgresProfile but use ExPostgresProfile instead" in {
      classes.that
        .haveNameNotMatching("^.*PostgresProfile\\$$")
        .should
        .onlyAccessClassesThat {
          assignableTo(classOf[com.github.tminglei.slickpg.ExPostgresProfile])
            .or(not[JavaClass](assignableTo(classOf[slick.jdbc.PostgresProfile])))
        }
        .because(
          s"a subclass of ExPostgresProfile like ${classOf[ExtendedPostgresProfile].getSimpleName} should be used instead")
        .checkAll(importedProductionClasses, importedTestClasses)
    }

    "only use logger defined in the same class or in Akka" in {
      classes
        .should(new ArchCondition[JavaClass]("only use logger defined in the same class or in Akka") {
          override def check(clazz: JavaClass, events: ConditionEvents): Unit = {
            clazz.getMethodCallsFromSelf.forEach { methodCall =>
              val allowedTargetOwnerNames = Seq(clazz.getFullName.replaceAll("\\$$", "")) ++ Option(
                  clazz.getEnclosingClass.orNull).map(_.getFullName)

              val target = methodCall.getTarget
              val targetOwnerName = target.getOwner.getFullName

              if (
                target.getName == "log"
                && target.getRawParameterTypes.getNames.size == 0
                && !allowedTargetOwnerNames.contains(targetOwnerName.replaceAll("\\$$", ""))
              ) {
                val message = s"Method `${target.getName}` " +
                  s"is called from ${methodCall.getSourceCodeLocation.toString.replaceAll("[()]", "")}; " +
                  s"this method is taken from $targetOwnerName rather than ${clazz.getFullName}"
                events.add(SimpleConditionEvent.violated(clazz, message))
              }
            }
          }
        })
        .check(importedProductionClasses)
    }

    "return ReplyEffect from methods rather than Effect" in {
      classes
        .should(new ArchCondition[JavaClass]("return ReplyEffect from methods rather than Effect") {
          override def check(clazz: JavaClass, events: ConditionEvents): Unit = {
            clazz.getMethods.forEach { method =>
              if (method.getRawReturnType.isEquivalentTo(classOf[akka.persistence.typed.scaladsl.Effect[_, _]])) {
                val message = s"Method ${method.getFullName} returns an Effect; " +
                  "use ReplyEffect instead to make sure that all commands are replied to"
                events.add(SimpleConditionEvent.violated(clazz, message))
              }
            }
          }
        })
        .check(importedProductionClasses)
    }
  }
}
