import base64
import logging

import aiohttp
import jwt
import ujson as json
from fastapi.exceptions import HTTPException
from fastapi.security import OpenIdConnect
from fastapi.security.utils import get_authorization_scheme_param
from jwt import InvalidTokenError
from jwt.algorithms import RSAAlgorithm
from starlette.requests import Request
from starlette.status import HTTP_401_UNAUTHORIZED, HTTP_403_FORBIDDEN

from user_context import settings
from user_context.schemas.common import TokenData
from user_context.services import BaseService
from user_context.services.secret_box import SecretBoxService

logger = logging.getLogger(__name__)


class RsaKeyRegistryService(BaseService):
    _keys = dict()

    @classmethod
    def get(cls, item):
        return cls._keys.get(item)

    @classmethod
    async def initialize(cls):
        async with aiohttp.ClientSession() as session:
            response = await session.get(settings.JWT_JWKS_URL, raise_for_status=True)
            keys = (await response.json()).get("keys")
            if not keys:
                msg = "Unable to find keys in response"
                logger.error(msg)
                raise ValueError(msg)
            for key in keys:
                kid = key.get("kid")
                algo = RSAAlgorithm.from_jwk(json.dumps(key))
                cls._keys[kid] = algo
                logger.info("{}: Key {} loaded.".format(cls.__name__, kid))

    @classmethod
    async def deinitialize(cls):
        pass


class OidcTokenScope(OpenIdConnect):
    ALGORITHM = "RS256"

    def __init__(self, scopes: list = None):
        super().__init__(openIdConnectUrl=settings.JWT_AUTO_DISCOVERY_URL)
        if not scopes:
            scopes = list()
        self.scopes = scopes

    async def __call__(self, request: Request) -> TokenData:
        try:
            token = await self.extract_token(request)
            kid = self.get_kid_from_token(token)
            rsa_kid = RsaKeyRegistryService.get(kid)
            decoded = jwt.decode(
                token,
                rsa_kid,
                verify=True,
                options=dict(verify_aud=False),
                algorithms=[self.ALGORITHM],
                issuer=settings.JWT_ISSUER,
            )

            token_data = await self.extract_token_data(decoded)
        except InvalidTokenError as e:
            logger.exception("{} {}".format(e.__class__.__name__, e))
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED,
                detail="Wrong token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except HTTPException as e:
            logger.exception("Auth errors: {} {}".format(e.__class__.__name__, e))
            raise
        return token_data

    async def extract_token_data(self, decoded):
        extra = decoded.get("extra")
        extra = SecretBoxService.decrypt_b64(extra)
        perms = extra.get("jpk")

        if not set(self.scopes).issubset(set(perms)):
            logger.warning("Scopes in token: {} but required: {}".format(perms, self.scopes))
            raise HTTPException(
                status_code=HTTP_403_FORBIDDEN,
                detail="Wrong token",
            )
        token_data = TokenData(
            sub=decoded.get("sub"),
            is_limited=decoded.get("lim"),
            originator=extra.get("orig"),
            audience_sub=extra.get("ops"),
            is_test_user=extra.get("ist"),
            permissions=perms,
        )
        return token_data

    def get_kid_from_token(self, token: str):
        try:
            header, _, _ = token.split(".")
            h = json.loads(base64.standard_b64decode(header + "==="))
        except ValueError as e:
            logger.exception("Wrong token - {}".format(e))
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED,
                detail="Wrong token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        kid = h.get("kid")
        alg = h.get("alg")
        if kid is None or alg is None or alg != self.ALGORITHM or RsaKeyRegistryService.get(kid) is None:
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED,
                detail="Wrong token ({} {})".format(kid, alg),
                headers={"WWW-Authenticate": "Bearer"},
            )
        return kid

    async def extract_token(self, request):
        authorization: str = request.headers.get("Authorization")
        scheme, param = get_authorization_scheme_param(authorization)
        if not authorization or scheme.lower() != "bearer":
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return param


_O = OidcTokenScope(["virtual_store:product:write"])
