package phoenix.core.emailing

import com.sendgrid.SendGrid

import phoenix.punters.domain.Email

final class EmailingModule(val mailer: Mailer)

object EmailingModule {
  def init(config: EmailNotificationsConfig): EmailingModule =
    init(EmailSenders.instance(config))

  def init(sender: EmailSender, contentRenderer: ContentRenderer = LocalContentRenderer): EmailingModule = {
    val mailer = new Mailer(sender, contentRenderer)
    new EmailingModule(mailer)
  }
}

private object EmailSenders {
  def instance(config: EmailNotificationsConfig): EmailSender =
    if (config.enabled)
      new SendGridEmailSender(buildSendGridClient(config.sendgrid), config.fromAddress)
    else
      NoopEmailSender

  private def buildSendGridClient(config: SendGridConfig): SendGrid = {
    config.apiHost.fold(new SendGrid(config.apiKey))(host => {
      // This is due to internals of SendGrid. They basically use the 'test' boolean variable to determine whether to prepend url with 'http' or 'https'
      val sendgrid = new SendGrid(config.apiKey, !host.sslEnabled)
      sendgrid.setHost(host.endpoint)
      sendgrid
    })
  }
}

final case class EmailNotificationsConfig(enabled: Boolean, fromAddress: Email, sendgrid: SendGridConfig)
final case class SendGridConfig(apiKey: String, apiHost: Option[SendGridHost] = None)
final case class SendGridHost(sslEnabled: Boolean, endpoint: String)
