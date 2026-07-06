package phoenix.core.emailing

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.io.Source

import org.fusesource.scalate.TemplateEngine
import org.fusesource.scalate.TemplateSource

import phoenix.core.emailing.EmailContentTemplate.TemplateName

private object LocalContentRenderer extends ContentRenderer {

  private lazy val engine: TemplateEngine = new TemplateEngine

  override def render(content: EmailContentTemplate)(implicit ec: ExecutionContext): Future[HtmlEmailContent] =
    for {
      loadedTemplate <- loadTemplate(content.templateName)
      renderedContent <- Future { engine.layout(loadedTemplate, content.templatingParams.toMap) }
    } yield HtmlEmailContent(renderedContent)

  private def loadTemplate(templateName: TemplateName)(implicit ec: ExecutionContext): Future[TemplateSource] =
    Future {
      val templateUri = s"/notification.templates/$templateName.mustache"
      val templateStream = getClass.getResourceAsStream(templateUri)
      TemplateSource.fromSource(templateUri, Source.fromInputStream(templateStream))
    }
}
