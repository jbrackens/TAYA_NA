package tech.argyll.gmx.predictorgame.domain

package object repository {

  def quote(input: Any): String = s"'${escapeQuotes(input.toString)}'"

  private def escapeQuotes(input: String) = input.replaceAll("'", "''")

}
