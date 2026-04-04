import javax.inject.Inject
import org.gradle.api.DefaultTask
import org.gradle.api.tasks.TaskAction

class SlickCodeGenerator @Inject()(var path: String, var pkg: String, generatorClass: String) extends DefaultTask {

  @TaskAction
  def runGenerator() {
    slick.codegen.SourceCodeGenerator.run(
      "slick.jdbc.PostgresProfile",
      "org.postgresql.Driver",
      "jdbc:postgresql://localhost:5432/predictor",
      path,
      pkg,
      Some("postgres"),
      Some("postgres"),
      true,
      Some(generatorClass)
    )
  }
}