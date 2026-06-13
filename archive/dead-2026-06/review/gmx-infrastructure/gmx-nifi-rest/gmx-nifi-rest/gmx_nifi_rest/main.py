import asyncio
import logging
import urllib.parse
from datetime import datetime, timezone
from typing import Tuple
from uuid import uuid4

import ujson
from fastapi import Depends, Header, HTTPException
from starlette.requests import Request

from gmx_nifi_rest.init_app import app
from gmx_nifi_rest.models import (
    ATMAddJiraRequest,
    ATMAddJiraResponse,
    ATMAddNoteRequest,
    ATMAddNoteResponse,
    ATMAddTagRequest,
    ATMAddTagResponse,
    AutoDocVerifyRequest,
    AutoDocVerifyResponse,
    CurrentBalanceWithSilentPaymentTokenResponse,
    ExternalUserBaseSchema,
    ExternalUserMappingSchema,
    ExternalUserMappingWithBalanceSchema,
    HealthCheckStatus,
    HealthCheckStatusRow,
    JiraWebhookRequest,
    JiraWebhookResponse,
    MarketingCreditJiraWebhookResponse,
    SbTechCasino2amConsentRequest,
    SbTechTokenForCurrentBalanceRequest,
    SbTechTokenRequest,
    TokenData,
    TokenStorePayload,
    TokenStorePostResponse,
    TruNarrativeAscnWebhookRequest,
    TruNarrativeMssnWebhookRequest,
    TruNarrativeRsnWebhookRequest,
    TruNarrativeWebhookResponse,
    VirtualShopPaymentRequest,
    VirtualShopPaymentResponse,
)
from gmx_nifi_rest.services.auth_service import OidcTokenScope, RsaKeyRegistryService
from gmx_nifi_rest.services.avro_schema import AvroService
from gmx_nifi_rest.services.http_service import OidcHttpService, WalletHttpService
from gmx_nifi_rest.services.kafka_service import KafkaService
from gmx_nifi_rest.services.redis_service import RedisService
from gmx_nifi_rest.services.sbtech_service import SbTokenExchangeService
from gmx_nifi_rest.services.secret_box import SecretBoxService
from gmx_nifi_rest.tools import (
    ascn_webhook_handle,
    extract_company_name_and_token,
    get_external_user_current_balance_from_company,
    get_external_user_mapping,
    get_stored_test_token,
    mssn_webhook_handle,
    rsn_webhook_handle,
    store_test_token,
    token_exchange_for_user_info,
    validate_and_add_jira_for_user,
    validate_and_add_note_for_user,
    validate_and_add_tag_for_user,
    validate_csv_and_topup_user,
    verify_auto_documents_flow,
    virtual_shop_order_line_for_resolve,
    virtual_shop_payment_from_company,
)

logger = logging.getLogger(__name__)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get(
    "/pc/me", response_model=TokenData,
)
async def is_me(
    token_data: TokenData = Depends(OidcTokenScope(["oidc:profile:last_seen:write"])),
    fs_message_api_id: str = Header(None),
) -> TokenData:
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    return token_data


async def _token_exchange_for_user_info_and_payment_token(company_name, token: str):
    user_info: ExternalUserMappingWithBalanceSchema = await get_external_user_current_balance_from_company(
        company_name, token, force_reload=True
    )
    result = CurrentBalanceWithSilentPaymentTokenResponse.create_from_external_user_mapping_with_balance_schema(
        data=user_info
    )
    return result


async def _token_exchange_for_user_info_prefix(fs_message_api_id, token: SbTechTokenRequest, request: Request):
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    company_name, stripped_token = await extract_company_name_and_token(token)
    await OidcTokenScope(["pc:token_exchange:{}".format(company_name)])(request)

    result = await _token_exchange_for_user_info_and_payment_token(company_name, stripped_token)
    return result


@app.post("/pc/token_exchange/sb_tech", response_model=CurrentBalanceWithSilentPaymentTokenResponse)
async def token_exchange_for_user_info_prefix(
    token: SbTechTokenRequest, request: Request, fs_message_api_id: str = Header(None)
) -> CurrentBalanceWithSilentPaymentTokenResponse:
    return await _token_exchange_for_user_info_prefix(fs_message_api_id, token, request)


@app.post("/wallet/token", response_model=CurrentBalanceWithSilentPaymentTokenResponse)
async def token_exchange_for_user_info_prefix(
    token: SbTechTokenRequest, request: Request, fs_message_api_id: str = Header(None)
) -> CurrentBalanceWithSilentPaymentTokenResponse:
    """
    Used by IR
    """
    # Token is url encoded and needs to be decoded
    token.token = urllib.parse.unquote(token.token)
    return await _token_exchange_for_user_info_prefix(fs_message_api_id, token, request)


@app.post("/pc/token_exchange/sb_tech/{company_name}", response_model=CurrentBalanceWithSilentPaymentTokenResponse)
async def token_exchange_for_user_info_company(
    company_name: str, token: SbTechTokenRequest, request: Request, fs_message_api_id: str = Header(None)
) -> CurrentBalanceWithSilentPaymentTokenResponse:
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    await OidcTokenScope(["pc:token_exchange:{}".format(company_name)])(request)
    return await _token_exchange_for_user_info_and_payment_token(company_name, token.token)


@app.post("/pc/token_exchange/for_user_info/sb_tech", response_model=ExternalUserMappingSchema)
async def token_exchange_for_user_info_prefix(
    token: SbTechTokenRequest, fs_message_api_id: str = Header(None)
) -> ExternalUserMappingSchema:
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    company_name, stripped_token = await extract_company_name_and_token(token)
    result = await get_external_user_mapping(company_name=company_name, token=stripped_token)
    return result


@app.post("/pc/token_exchange/for_user_info/sb_tech/{company_name}", response_model=ExternalUserMappingSchema)
async def token_exchange_for_user_info_company(
    company_name: str, token: SbTechTokenRequest, fs_message_api_id: str = Header(None)
) -> ExternalUserMappingSchema:
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    result = await get_external_user_mapping(company_name, token.token)
    return result


async def _token_exchange_for_current_balance_prefix(fs_message_api_id, token):
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    company_name, stripped_token = await extract_company_name_and_token(token)
    result = await get_external_user_current_balance_from_company(
        company_name, stripped_token, force_reload=token.force_reload
    )
    return result


@app.post("/pc/token_exchange/for_current_balance/sb_tech", response_model=ExternalUserMappingWithBalanceSchema)
async def token_exchange_for_current_balance_prefix(
    token: SbTechTokenForCurrentBalanceRequest, fs_message_api_id: str = Header(None)
) -> ExternalUserMappingWithBalanceSchema:
    return await _token_exchange_for_current_balance_prefix(fs_message_api_id, token)


@app.post("/wallet/sb_tech/current_balance", response_model=ExternalUserMappingWithBalanceSchema)
async def token_exchange_for_current_balance_prefix(
    token: SbTechTokenForCurrentBalanceRequest, fs_message_api_id: str = Header(None)
) -> ExternalUserMappingWithBalanceSchema:
    """
    Used by IR
    """
    return await _token_exchange_for_current_balance_prefix(fs_message_api_id, token)


@app.post(
    "/pc/token_exchange/for_current_balance/sb_tech/{company_name}", response_model=ExternalUserMappingWithBalanceSchema
)
async def token_exchange_for_current_balance_prefix(
    company_name: str, token: SbTechTokenForCurrentBalanceRequest, fs_message_api_id: str = Header(None)
) -> ExternalUserMappingWithBalanceSchema:
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    result = await get_external_user_current_balance_from_company(
        company_name, token.token, force_reload=token.force_reload
    )
    return result


@app.get("/pc/health_check", response_model=HealthCheckStatus)
async def health_check() -> HealthCheckStatus:
    result: Tuple[HealthCheckStatusRow, ...] = await asyncio.gather(
        RsaKeyRegistryService.get_status(),
        AvroService.get_status(),
        OidcHttpService.get_status(),
        WalletHttpService.get_status(),
        KafkaService.get_status(),
        RedisService.get_status(),
        SecretBoxService.get_status(),
        SbTokenExchangeService.get_status(),
    )
    status = True
    for item in result:
        status = status and item.status
        if not status:
            break
    response = HealthCheckStatus(details=result)
    if not status:
        logger.info("Health check: ERROR - {}".format(ujson.dumps(response.dict())))
        raise HTTPException(status_code=500, detail=response.dict())
    logger.info("Health check: OK")
    return response


@app.post(
    "/pc/virtual_shop_payment/sport_nation",
    response_model=VirtualShopPaymentResponse,
    dependencies=(Depends(OidcTokenScope(["pc:virtual_shop_payment:sport_nation"])),),
)
async def virtual_shop_payment_sport_nation(
    payload: VirtualShopPaymentRequest, fs_message_api_id: str = Header(None)
) -> VirtualShopPaymentResponse:
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    result = await virtual_shop_payment_from_company("sport_nation", payload)
    return result


@app.post(
    "/pc/virtual_shop_payment/red_zone",
    response_model=VirtualShopPaymentResponse,
    dependencies=(Depends(OidcTokenScope(["pc:virtual_shop_payment:red_zone"])),),
)
async def virtual_shop_payment_red_zone(
    payload: VirtualShopPaymentRequest, fs_message_api_id: str = Header(None)
) -> VirtualShopPaymentResponse:
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    result = await virtual_shop_payment_from_company("red_zone", payload)
    return result


@app.post("/pc/webhook/jira", response_model=JiraWebhookResponse)
async def virtual_shop_order_line_resolved(
    payload: JiraWebhookRequest, fs_message_api_id: str = Header(None)
) -> JiraWebhookResponse:
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    result = await virtual_shop_order_line_for_resolve(payload)
    return result


@app.post("/pc/webhook/jira/marketing_credit", response_model=MarketingCreditJiraWebhookResponse)
async def validated_csv_and_top_upped_user(
    payload: JiraWebhookRequest, fs_message_api_id: str = Header(None)
) -> MarketingCreditJiraWebhookResponse:
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    result = await validate_csv_and_topup_user(payload)
    return result


@app.post("/pc/webhook/trunarrative/mssn", response_model=TruNarrativeWebhookResponse)
async def mssn_webhook(
    payload: TruNarrativeMssnWebhookRequest, fs_message_api_id: str = Header(None)
) -> TruNarrativeWebhookResponse:
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    result = await mssn_webhook_handle(payload)
    return result


@app.post("/pc/webhook/trunarrative/ascn", response_model=TruNarrativeWebhookResponse)
async def ascn_webhook(
    payload: TruNarrativeAscnWebhookRequest, fs_message_api_id: str = Header(None)
) -> TruNarrativeWebhookResponse:
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    result = await ascn_webhook_handle(payload)
    return result


# @app.post("/pc/webhook/trunarrative/jrn", response_model=JiraWebhookResponse)
# async def virtual_shop_order_line_resolved(
#     payload: JiraWebhookRequest, fs_message_api_id: str = Header(None)
# ) -> JiraWebhookResponse:
#     logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
#     result = await virtual_shop_order_line_for_resolve(payload)
#     return result


@app.post("/pc/webhook/trunarrative/rsn", response_model=JiraWebhookResponse)
async def rsn_webhook(
    payload: TruNarrativeRsnWebhookRequest, fs_message_api_id: str = Header(None)
) -> TruNarrativeWebhookResponse:
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    result = await rsn_webhook_handle(payload)
    return result


@app.post(
    "/pc/auto_docs_verification/", response_model=AutoDocVerifyResponse,
)
async def verify_auto_documentation_tn(
    payload: AutoDocVerifyRequest, retry: bool = False, fs_message_api_id: str = Header(None)
) -> AutoDocVerifyResponse:
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    result = await verify_auto_documents_flow(payload, retry)
    return result


@app.get(
    "/pc/token_test/store_token/{key}", response_model=str,
)
async def get_stored_token(key: str, fs_message_api_id: str = Header(None)) -> str:
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    result = await get_stored_test_token(key)
    return result


@app.post("/pc/token_test/store_token", response_model=TokenStorePostResponse)
async def store_token(payload: TokenStorePayload, fs_message_api_id: str = Header(None)) -> TokenStorePostResponse:
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    result = await store_test_token(payload)
    return result


@app.post("/pc/atm/add_tag", response_model=ATMAddTagResponse)
async def validate_and_add_tag(payload: ATMAddTagRequest, fs_message_api_id: str = Header(None)) -> ATMAddTagResponse:
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    result = await validate_and_add_tag_for_user(payload, fs_message_api_id)
    return result


@app.post("/pc/atm/add_note", response_model=ATMAddNoteResponse)
async def validate_and_add_note(
    payload: ATMAddNoteRequest, fs_message_api_id: str = Header(None)
) -> ATMAddNoteResponse:
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    result = await validate_and_add_note_for_user(payload, fs_message_api_id)
    return result


@app.post("/pc/atm/add_jira", response_model=ATMAddJiraResponse)
async def validate_and_add_jira(
    payload: ATMAddJiraRequest, fs_message_api_id: str = Header(None)
) -> ATMAddJiraResponse:
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    result = await validate_and_add_jira_for_user(payload, fs_message_api_id)
    return result


@app.post("/pc/casino_2am_consent")
async def casino_2am_consent(request: SbTechCasino2amConsentRequest, fs_message_api_id: str = Header(None)):
    logger.info("Received {} as FS-Message-Api-Id".format(fs_message_api_id))
    company_name, stripped_token = await extract_company_name_and_token(request)
    external_user: ExternalUserBaseSchema = await token_exchange_for_user_info(company_name, stripped_token)
    action = "2AM_CASINO_YES" if request.casino_2am_consent else "2AM_CASINO_NO"
    data = KafkaService.Models.Casino2amAction(
        uuid=str(uuid4()),
        createdDateUTC=datetime.now(timezone.utc).timestamp(),
        companyId=external_user.company_id,
        externalUserId=external_user.external_user_id,
        userId=None,
        email=external_user.email,
        action=action,
    )
    data_key = KafkaService.Models.Casino2amActionKey(externalUserId=external_user.external_user_id)

    await KafkaService.send_casino_2am_action(data=data, data_key=data_key, company_name=external_user.company_name)
    logger.info(
        "FS-Message-Api-Id({}) published data on kafka for {} at {} with action={}".format(
            fs_message_api_id, external_user.external_user_id, external_user.company_name, action
        )
    )
