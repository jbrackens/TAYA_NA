package phoenix.punters.support

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.actor.typed.ActorSystem
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.unmarshalling.Unmarshal
import akka.stream.Materializer
import io.circe.Decoder
import io.circe.generic.semiauto.deriveDecoder
import org.testcontainers.containers.GenericContainer

import phoenix.core.emailing.SendGridConfig
import phoenix.core.emailing.SendGridHost
import phoenix.http.JsonMarshalling._
import phoenix.http.core.AkkaHttpClient
import phoenix.http.core.HttpClient
import phoenix.punters.support.SendgridMockContainer.SendgridMail

final class SendgridMockContainer(httpClient: HttpClient)(implicit ec: ExecutionContext, mat: Materializer)
    extends GenericContainer[SendgridMockContainer]("ghashange/sendgrid-mock:1.7.0") {

  private val apiKey = "secret_key"

  addEnv("API_KEY", apiKey)
  addExposedPort(3000)

  def config: SendGridConfig =
    SendGridConfig(apiKey = apiKey, apiHost = Some(SendGridHost(sslEnabled = false, endpoint = serverRoot)))

  def sentEmails(): Future[List[SendgridMail]] = {
    for {
      response <- httpClient.sendRequest(HttpRequest(uri = s"http://$serverRoot/api/mails"))
      emails <- Unmarshal(response.entity).to[List[SendgridMail]]
    } yield emails
  }

  private lazy val serverRoot: String = s"$getHost:${getMappedPort(3000)}"
}

object SendgridMockContainer {
  def started(actorSystem: ActorSystem[_]): SendgridMockContainer = {
    val classicalSystem = actorSystem.classicSystem
    val httpClient = new AkkaHttpClient(classicalSystem)
    val container =
      new SendgridMockContainer(httpClient)(actorSystem.executionContext, Materializer(classicalSystem))
    container.start()
    container
  }

  final case class SendgridMail(
      from: From,
      subject: String,
      personalizations: List[Personalization],
      content: List[Content],
      attachments: List[Attachments])
  final case class From(email: String)
  final case class Personalization(to: List[To])
  final case class To(email: String)
  final case class Content(`type`: String, value: String)
  final case class Attachments(`type`: String, content: String, filename: String, disposition: String)

  private implicit val fromReader: Decoder[From] = deriveDecoder
  private implicit val toReader: Decoder[To] = deriveDecoder
  private implicit val personalizationReader: Decoder[Personalization] = deriveDecoder
  private implicit val contentReader: Decoder[Content] = deriveDecoder
  private implicit val attachmentReader: Decoder[Attachments] = deriveDecoder
  private implicit val sendgridEmailReader: Decoder[SendgridMail] = deriveDecoder
}
