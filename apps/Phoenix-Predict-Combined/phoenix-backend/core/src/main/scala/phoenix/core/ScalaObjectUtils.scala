package phoenix.core

object ScalaObjectUtils {
  implicit class ScalaObjectOps(self: AnyRef) {

    /**
     * For the following object:
     *
     * {{{
     * package foo.bar
     * object Qux {
     *   object Zax
     * }
     * }}}
     *
     * calling `Qux.Zax.simpleObjectName` will return `Zax`.
     */
    def simpleObjectName: String = {
      // Split and not just replace, since we also want to remove the enclosing class names, if any.
      self.getClass.getSimpleName.split("\\$").last
    }

    /**
     * For the following object:
     *
     * {{{
     * package foo.bar
     * object Qux {
     *   object Zax
     * }
     * }}}
     *
     * calling `Qux.Zax.simpleObjectName` will return `foo.bar.Qux.Zax`.
     */
    def objectName: String = {
      // Trailing `$`: the one appended by Scala compiler to classes of all `object`s
      // Remaining `$`s: injected into member class names by both Java and Scala compilers
      self.getClass.getName.replaceAll("\\$$", "").replaceAll("\\$", ".")
    }
  }

  implicit class ClassOps[A](self: Class[A]) {

    private val SingletonStaticFieldName = "MODULE$"

    def isScalaObject: Boolean = {
      self.getFields.exists(_.getName == SingletonStaticFieldName)
    }

    /**
     * If one has access to Class of the given Scala object, but not to the object itself:
     *
     * {{{
     * object Qux
     *
     * .... (and in another file)
     *
     * val quxClazz: Class[Qux.type] = ...
     * }}}
     *
     * calling `quxClazz.objectSingletonInstance` returns `Qux` itself.
     */
    def objectSingletonInstance: A = {
      self.getField(SingletonStaticFieldName).get(self).asInstanceOf[A]
    }
  }
}
