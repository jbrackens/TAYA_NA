package phoenix.punters.idcomply.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.Clock
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.idcomply.domain.CreateIDPVToken.CreateIDPVTokenWrongRequest
import phoenix.punters.idcomply.domain.Events.PunterWasAskedForPhotoVerification
import phoenix.punters.idcomply.domain.IDPVUrl
import phoenix.punters.idcomply.domain.IdComplyService
import phoenix.punters.idcomply.domain.RegistrationEventRepository

final class RequestIDPVProcess(
    idComplyService: IdComplyService,
    registrationEventRepository: RegistrationEventRepository,
    clock: Clock)(implicit ec: ExecutionContext) {

  def requestIDPV(punterId: PunterId): EitherT[Future, CreateIDPVTokenWrongRequest.type, IDPVUrl] =
    for {
      tokenResult <- idComplyService.createIDPVToken(punterId)
      _ <- EitherT.liftF(
        registrationEventRepository.save(
          PunterWasAskedForPhotoVerification(
            punterId,
            clock.currentOffsetDateTime(),
            tokenResult.token,
            tokenResult.openKey)))
      idpvUrl = idComplyService.createIDPVUrl(tokenResult.token, tokenResult.openKey)
    } yield idpvUrl
}
