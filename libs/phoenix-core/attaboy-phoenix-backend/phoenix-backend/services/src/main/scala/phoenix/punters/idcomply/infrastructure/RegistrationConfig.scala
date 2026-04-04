package phoenix.punters.idcomply.infrastructure

import pureconfig.ConfigReader
import pureconfig.generic.auto._

import phoenix.core.config.BaseConfig

final case class RegistrationConfig(
    apiKey: ApiKey,
    idpvEndpoint: IDPVCustomerEndpoint,
    endpointPaths: EndpointPaths,
    photoVerificationBaseUrl: PhotoVerificationBaseUrl,
    frontEndRedirectionEndpoint: IDPVFrontEndRedirectionEndpoint)

final case class ApiKey(value: String)
final case class PhotoVerificationBaseUrl(value: String)
final case class IDPVFrontEndRedirectionEndpoint(value: String)
final case class IDPVCustomerEndpoint(value: String)

final case class EndpointPaths(
    knowYourCustomer: KnowYourCustomerEndpointPath,
    knowledgeBasedAuthentication: KnowledgeBasedAuthenticationEndpointPath,
    idPhotoVerificationToken: IdPhotoVerificationCreateTokenEndpointPath,
    idPhotoVerificationTokenStatus: IdPhotoVerificationTokenStatusEndpointPath)

final case class KnowYourCustomerEndpointPath(value: String)
final case class KnowledgeBasedAuthenticationEndpointPath(value: String)
final case class IdPhotoVerificationCreateTokenEndpointPath(value: String)
final case class IdPhotoVerificationTokenStatusEndpointPath(value: String)

object RegistrationConfig {
  implicit val apiKeyReader: ConfigReader[ApiKey] = ConfigReader[String].map(ApiKey)
  implicit val frontEndRedirectionEndpointReader: ConfigReader[IDPVFrontEndRedirectionEndpoint] =
    ConfigReader[String].map(IDPVFrontEndRedirectionEndpoint)
  implicit val idpvCustomerEndpointReader: ConfigReader[IDPVCustomerEndpoint] =
    ConfigReader[String].map(IDPVCustomerEndpoint)
  implicit val photoVerificationBaseUrlReader: ConfigReader[PhotoVerificationBaseUrl] =
    ConfigReader[String].map(PhotoVerificationBaseUrl)
  implicit val knowYourCustomerEndpointPathReader: ConfigReader[KnowYourCustomerEndpointPath] =
    ConfigReader[String].map(KnowYourCustomerEndpointPath)
  implicit val knowledgeBasedAuthenticationEndpointPathReader: ConfigReader[KnowledgeBasedAuthenticationEndpointPath] =
    ConfigReader[String].map(KnowledgeBasedAuthenticationEndpointPath)
  implicit val idPhotoVerificationEndpointPathReader: ConfigReader[IdPhotoVerificationCreateTokenEndpointPath] =
    ConfigReader[String].map(IdPhotoVerificationCreateTokenEndpointPath)
  implicit val idPhotoVerificationTokenStatusEndpointPath: ConfigReader[IdPhotoVerificationTokenStatusEndpointPath] =
    ConfigReader[String].map(IdPhotoVerificationTokenStatusEndpointPath)

  object of extends BaseConfig[RegistrationConfig]("phoenix.idcomply")
}
