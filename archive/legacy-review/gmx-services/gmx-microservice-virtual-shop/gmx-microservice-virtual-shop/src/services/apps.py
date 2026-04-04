import logging

from django.apps import AppConfig
from django.conf import settings

from services.pc_service import PcService

logger = logging.getLogger(__name__)


# noinspection PyMethodMayBeStatic
class ServicesConfig(AppConfig):
    """
    class ServicesConfig is used to initialize Singletons: PcService
     with proper values.
    """

    name = "services"

    def _initialize_pc_service(self):
        """
        `oidc_authentication_url`, `oidc_client_id`, `oidc_client_secret`, 'tech_username' and 'tech_user_password'
         are initialized in class PcService().__init__
        `tech_username` and `tech_user_password` are credentials of Technical User, which is required to perform
        `password_flow`.
        """
        logger.info("Initializing PcService in ready()")
        PcService(
            oidc_authentication_url=settings.OIDC_AUTHENTICATION_URL,
            oidc_client_id=settings.OIDC_CLIENT_ID,
            oidc_client_secret=settings.OIDC_CLIENT_SECRET,
            tech_username=settings.PC_TECH_USERNAME,
            tech_user_password=settings.PC_TECH_USERNAME_PASSWORD,
        )

    def ready(self):
        """
        Method `ready` is call always on startup of app or when server is restarted.
        """
        self._initialize_pc_service()
