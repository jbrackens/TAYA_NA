import logging

from aws_rest_default.service import AbstractPasswordFlowService
from django.conf import settings

logger = logging.getLogger(__name__)


class PcService(AbstractPasswordFlowService):
    """
    This class is used to create communication with service by performing OAuth2 Password Authentication flow.
    """

    ENDPOINT_SBTECH_TOKEN_FOR_USER_INFO = "{}/pc/token_exchange/for_user_info/sb_tech".format(
        settings.PROCESS_CONTROLLER_HOST
    )
    ENDPOINT_SBTECH_TOKEN_FOR_USER_CURRENT_BALANCE_INFO = "{}/pc/token_exchange/for_current_balance/sb_tech".format(
        settings.PROCESS_CONTROLLER_HOST
    )

    def exchange_sb_token_for_user(self, sb_token: str, api_request: str = None) -> dict:
        """
        This method is used to make request to RMX, validate sb_token and receive user info.
        :param sb_token: SBTech Token
        :param api_request: API request
        :return: response [:class: `dict`] received data from RMX
        """
        # id_token = self.get_id_token()
        if api_request is None:
            api_request = "SBTECH_TOKEN_USER_INFO_{}".format(sb_token)

        response = self._make_request(
            self.ENDPOINT_SBTECH_TOKEN_FOR_USER_INFO,
            # token=id_token,
            post=True,
            payload={"token": sb_token},
            api_message_request_id=api_request,
        )
        return response

    def exchange_sb_token_for_user_current_balance(self, sb_token: str, api_request: str = None) -> dict:
        """
        This method is used to make request to RMX, validate sb_token and receive user current balance info.
        :param sb_token: SBTech Token
        :param api_request: API request
        :return: response [:class: `dict`] received data from RMX
        """
        # id_token = self.get_id_token()
        if api_request is None:
            api_request = "SBTECH_TOKEN_USER_BALANCE_INFO_{}".format(sb_token)

        response = self._make_request(
            self.ENDPOINT_SBTECH_TOKEN_FOR_USER_CURRENT_BALANCE_INFO,
            # token=id_token,
            post=True,
            payload={"token": sb_token},
            api_message_request_id=api_request,
        )
        return response

    def virtual_shop_payment(
        self, sb_token: str, price: str, title: str, order_uid: str, pc_endpoint: str, api_request: str = None
    ):
        """
         Method `charge_user` is used to subtract define value from users `current_balance`.
         Request is send to url of RewardsMatrix Wallet Service with credentials of logged in user,
          `price`, `transaction_id`  and `id_token` received form method `_get_id_token`

        :param price: [:class: `int`] price which need to be added to users wallet
         :param sb_token: [:class: `user`] sb_token describing users credentials
         :param title: [:class: `int`] reason why wallet was chargeUp
         :param order_uid: [:class: `str`] order UID
         :param pc_endpoint: [:class: `str`] endpoint for ProcessController
         :param api_request: [:class: `str`] api message
         :return: response: [:class: `json`]
        """
        id_token = self.get_id_token()
        if api_request is None:
            api_request = "SBTECH_TOKEN_USER_INFO_{}".format(sb_token)

        payload = {
            "token": sb_token,
            "price": float(price),
            "title": title,
            "transaction_id": order_uid,
        }

        response = self._make_request(
            "{}{}".format(settings.PROCESS_CONTROLLER_HOST, pc_endpoint),
            token=id_token,
            post=True,
            payload=payload,
            api_message_request_id=api_request,
        )

        return response
