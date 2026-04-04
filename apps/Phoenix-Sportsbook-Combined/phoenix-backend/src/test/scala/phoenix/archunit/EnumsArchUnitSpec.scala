package phoenix.archunit

import java.lang.reflect.Modifier

import scala.jdk.CollectionConverters._

import com.tngtech.archunit.base.DescribedPredicate
import com.tngtech.archunit.core.domain.JavaCall.Predicates.target
import com.tngtech.archunit.core.domain.JavaClass.Predicates.equivalentTo
import com.tngtech.archunit.core.domain._
import com.tngtech.archunit.core.domain.properties.HasName.Predicates.nameMatching
import com.tngtech.archunit.core.domain.properties.HasOwner.Predicates.With.owner
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses
import org.scalatest.wordspec.AnyWordSpecLike
import sttp.tapir.AnyEndpoint

import phoenix.archunit.BaseArchUnitSpec.importedProductionClasses

class EnumsArchUnitSpec extends AnyWordSpecLike with BaseArchUnitSpec {

  "Classes" should {
    "never call sttp.tapir.Codec#set but use enumQueryWith(All)ValuesWhenSkipped instead" in {
      noClasses.that
        .doNotHaveFullyQualifiedName("phoenix.http.routes.EndpointInputs$EnumCodec")
        .should
        .callMethodWhere {
          target {
            owner {
              equivalentTo(sttp.tapir.Codec.getClass)
            }
          } and target {
            nameMatching("set")
          }
        }
        .because(
          "vanilla Codec#set leads to rather unexpected consequences - " +
          "when no element is provided via query params (which is typically supposed to mean 'no filter applied'), " +
          "the resulting Set is also empty, which typically leads to the service logic returning an empty result; " +
          "consider EndpointInputs.enumQueryWith(All)ValuesWhenSkipped instead")
        .check(importedProductionClasses)
    }
  }

  "Classes that define any Tapir (PartialServer)Endpoints" should {
    "extend TapirCodecEnumeratum" in {
      classes.that
        .resideOutsideOfPackage("phoenix.http.core")
        .and(new DescribedPredicate[JavaClass](
          "define non-static metods returning sttp.tapir.Endpoint or sttp.tapir.server.PartialServerEndpoint") {
          override def apply(clazz: JavaClass): Boolean = {
            val methods = clazz.getAllMethods.asScala.toSeq.filter { method =>
              // Static methods in Scala are only generated as wrappers for the methods of Scala objects
              // to make their invocation from outside Scala easier (e.g. in Java, just `Foo.foo()` instead of `Foo$.MODULE$.foo()`).
              // If a class `Foo` defines a static method, it means that the actual implementation is in the class `Foo$` anyway.
              // We want `Foo$` rather than `Foo` to extend `TapirCodecEnumeratum` in such case.
              val isStatic = Modifier.isStatic(method.reflect.getModifiers)

              val returnType = method.getRawReturnType
              val returnsEndpoint = returnType.isEquivalentTo(classOf[AnyEndpoint]) ||
                returnType.isEquivalentTo(classOf[sttp.tapir.server.PartialServerEndpoint[_, _, _, _, _, _, cats.Id]])

              !isStatic && returnsEndpoint
            }
            methods.nonEmpty
          }
        })
        .should
        .beAssignableTo(classOf[sttp.tapir.codec.enumeratum.TapirCodecEnumeratum])
        .because("otherwise Tapir treats all Enumeratum enums in the referenced schemas as regular ADTs rather than the actual enums")
        .check(importedProductionClasses)
    }
  }

  "Classes that extend EnumEntry" should {
    "extend EnumEntry.UpperSnakecase" in {
      classes.that
        .haveModifier(JavaModifier.ABSTRACT)
        .or
        .areInterfaces
        .and
        .areAssignableTo(classOf[enumeratum.EnumEntry])
        .and
        // betgenius models use Camelcase enums
        .resideOutsideOfPackage("phoenix.betgenius.domain")
        .should
        .beAssignableTo(classOf[enumeratum.EnumEntry.UpperSnakecase])
        .because("as we agreed with the Front End team, " +
        "all enums should be written as FOO_BAR, not FooBar " +
        "in JSONs and Swagger specs (and DB columns for consistency)")
        .check(importedProductionClasses)
    }
  }
}
