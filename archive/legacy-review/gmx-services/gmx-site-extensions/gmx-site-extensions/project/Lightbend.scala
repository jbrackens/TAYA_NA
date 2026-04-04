import sbt.librarymanagement.DependencyBuilders
import sbt.{ Resolver, url }

object Lightbend extends DependencyBuilders {

  def commercialResolvers(lightbendCommercialToken: String): Seq[Resolver] = {
    val lightbendCommercialResolverUrl: String = s"https://repo.lightbend.com/pass/$lightbendCommercialToken/commercial-releases"
    val mvnResolver = "lightbend-commercial-mvn" at lightbendCommercialResolverUrl
    val ivyResolver = Resolver.url("lightbend-commercial-ivy", url(lightbendCommercialResolverUrl))(Resolver.ivyStylePatterns)
    Seq(mvnResolver, ivyResolver)
  }
}
