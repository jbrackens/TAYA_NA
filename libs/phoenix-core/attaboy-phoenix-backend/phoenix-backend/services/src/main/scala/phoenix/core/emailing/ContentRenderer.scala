package phoenix.core.emailing

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.core.emailing.EmailContentTemplate.TemplateName
import phoenix.core.emailing.EmailContentTemplate.TemplatingParams
import phoenix.punters.domain.Email

trait ContentRenderer {
  def render(contentTemplate: EmailContentTemplate)(implicit ec: ExecutionContext): Future[HtmlEmailContent]
}

final case class EmailMessageTemplate(
    recipient: Email,
    subject: EmailSubject,
    contentTemplate: EmailContentTemplate,
    attachments: List[EmailAttachment] = List.empty)
final case class EmailContentTemplate(templateName: TemplateName, templatingParams: TemplatingParams)
object EmailContentTemplate {
  type TemplateName = String

  trait TemplatingParams {
    def toMap: Map[String, Any]
  }

  object NoParams extends TemplatingParams {
    override def toMap: Map[String, Any] = Map.empty
  }
}
