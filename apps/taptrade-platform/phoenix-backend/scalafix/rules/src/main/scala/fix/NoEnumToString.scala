package fix

import enumeratum._

import metaconfig.{Conf, Configured}
import scala.annotation.tailrec
import scala.meta._
import scala.meta.internal.pc.ScalafixGlobal
import scala.meta.internal.proxy.GlobalProxy
import scala.reflect.internal.util.{Position => ScalaPosition}
import scala.util.control.NonFatal
import scala.util.Properties
import scalafix.internal.v1.LazyValue
import scalafix.v1._
import scala.util.Try

case class ToString(tree: Tree, tpe: ScalafixGlobal#Type) extends Diagnostic {
  override def position: Position = tree.pos
  override def message: String = s"Don't call `$tpe.toString()`, use `entryName`"
}

case class Interpolation(term: Term, tpe: ScalafixGlobal#Type) extends Diagnostic {
  override def position: Position = term.pos
  override def message: String = s"Don't interpolate `$tpe` without using `entryName`"
}

case class Fishy(term: Term, tree: String) extends Diagnostic {
  override def position: Position = term.pos
  override def message: String =
    s"Something fishy happens here, consider disabling or amending this rule: `$term` is typed as `$tree`"
}

class NoEnumToString(global: LazyValue[Option[ScalafixGlobal]]) extends SemanticRule("NoEnumToString") {
  def this() = this(null) // scalastyle:ignore

  override def afterComplete(): Unit =
    global.value.foreach(g =>
      try {
        g.askShutdown()
        g.close()
      } catch {
        case NonFatal(_) =>
      })

  override def withConfiguration(c: Configuration): Configured[Rule] = {
    if (c.scalacClasspath.nonEmpty && c.scalaVersion != Properties.versionNumberString)
      Configured.typeMismatch(
        s"scalaVersion=${Properties.versionNumberString}",
        Conf.Obj("scalaVersion" -> Conf.Str(c.scalaVersion)))
    else
      Configured.Ok(new NoEnumToString(LazyValue.fromUnsafe(() =>
        ScalafixGlobal.newCompiler(c.scalacClasspath, c.scalacOptions, Map()))))
  }

  override def fix(implicit doc: SemanticDocument): Patch =
    global.value.map(NoEnumToStringImpl(_).fix(doc)).getOrElse(Patch.empty)
}

case class NoEnumToStringImpl(global: ScalafixGlobal) {

  def fix(doc: SemanticDocument): Patch = {
    val unit: global.CompilationUnit = global.newCompilationUnit(doc.input.text, doc.input.syntax)
    doc.tree.collect {
      case t @ Term.Select(term, Term.Name("toString")) =>
        getTypedTree(term, unit).flatMap(isEnumEntry).map(tpe => Patch.lint(ToString(t, tpe))).getOrElse(Patch.empty)
      case t @ Term.Interpolate(Term.Name("s"), _, argTerms) =>
        getTypedTree(t, unit) match { // Applying getTypedTree to the `argTerms` always returns `String`
          case Some(global.Apply(global.Select(_, global.TermName("s")), args)) if args.length == argTerms.length =>
            args
              .zip(argTerms)
              .flatMap { case (tree, term) => isEnumEntry(tree).map(tpe => Patch.lint(Interpolation(term, tpe))) }
              .asPatch
          case Some(tree) => Patch.lint(Fishy(t, tree.toString()))
          case None       => Patch.empty // Unfortunately, sometimes typing just fails on a completely legitimate code
        }
    }.asPatch
  }

  private def isEnumEntry(term: global.Tree): Option[global.Type] =
    Option(term.tpe).map(_.dealiasWiden).filter(!_.isError).filter(_ <:< global.typeOf[EnumEntry])

  private def getTypedTree(term: Term, unit: global.CompilationUnit): Option[global.Tree] = {
    val pos = global.rangePos(unit.source, term.pos.start, term.pos.start, term.pos.end)
    Try(GlobalProxy.typedTreeAt(global, pos)).toOption
  }
}
