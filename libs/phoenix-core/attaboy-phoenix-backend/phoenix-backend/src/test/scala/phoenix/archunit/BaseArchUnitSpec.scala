package phoenix.archunit

import java.lang.annotation.Annotation
import java.util.regex.Pattern

import scala.reflect.ClassTag

import com.tngtech.archunit.core.domain.JavaClass
import com.tngtech.archunit.core.domain.JavaClasses
import com.tngtech.archunit.core.domain.JavaModifier
import com.tngtech.archunit.core.importer.ClassFileImporter
import com.tngtech.archunit.core.importer.ImportOption
import com.tngtech.archunit.core.importer.Location
import com.tngtech.archunit.lang.ArchRule
import org.slf4j.LoggerFactory

trait BaseArchUnitSpec {
  implicit class JavaClassOps(self: JavaClass) {
    def isConcrete: Boolean = {
      !(self.isInterface || self.getModifiers.contains(JavaModifier.ABSTRACT))
    }

    def hasAnnotation[T <: Annotation](implicit classTag: ClassTag[T]): Boolean = {
      self.isAnnotatedWith(classTag.runtimeClass.asInstanceOf[Class[_ <: Annotation]])
    }
  }

  implicit class ArchRuleOps(self: ArchRule) {
    def checkAll(classeses: JavaClasses*): Unit = {
      classeses.foreach(classes => self.check(classes))
    }
  }

}

object BaseArchUnitSpec {

  private val log = LoggerFactory.getLogger(getClass)

  // Let's import classes just once in the object lifetime (and not once per test suite instance) to speed things up.
  private val classFileImporter = new ClassFileImporter()

  private val testClassLocationPattern = Pattern.compile(".*/target/scala-.*/(contract|it|test)-classes/.*")
  private val isTestClass: ImportOption = (location: Location) => location.matches(testClassLocationPattern)
  private val isProductionClass: ImportOption = (location: Location) => !isTestClass.includes(location)

  lazy val importedProductionClasses: JavaClasses = {
    val start = System.nanoTime()
    val result = classFileImporter.withImportOption(isProductionClass).importPackages("phoenix")
    log.info(s"Time elapsed on importing production classes to ArchUnit: ${(System.nanoTime() - start) / 1e6} sec")
    result
  }

  lazy val importedTestClasses: JavaClasses = {
    val start = System.nanoTime()
    val result = classFileImporter.withImportOption(isTestClass).importPackages("phoenix")
    log.info(s"Time elapsed on importing test classes to ArchUnit: ${(System.nanoTime() - start) / 1e6} sec")
    result
  }
}
