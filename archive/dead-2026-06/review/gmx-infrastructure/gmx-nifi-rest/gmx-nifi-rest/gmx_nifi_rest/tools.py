import logging
import time
from datetime import datetime
from decimal import Decimal
from typing import Optional, Tuple
from uuid import uuid4

import ujson
from fastapi import HTTPException
from fastavro._validation import ValidationError

from gmx_nifi_rest import settings
from gmx_nifi_rest.csv_file_validator import jira_ticket_handling, validate_top_up_csv_file
from gmx_nifi_rest.enums import (
    AutoDocDecisionEnums,
    AutoDocJourneyTypeEnums,
    AutoDocNifiActionEnums,
    AutoDocStatusCodeEnums,
    AutoDocStatusEnums,
)
from gmx_nifi_rest.exception import SbTokenRefreshError
from gmx_nifi_rest.helpers import prepare_tn_client_reference
from gmx_nifi_rest.http_exceptions import DirectHttpException
from gmx_nifi_rest.models import (
    ARN,
    ATMAddJiraRequest,
    ATMAddJiraResponse,
    ATMAddNoteRequest,
    ATMAddNoteResponse,
    ATMAddTagRequest,
    ATMAddTagResponse,
    AutoDocVerifyRequest,
    AutoDocVerifyResponse,
    ExternalUserBaseSchema,
    ExternalUserMappingSchema,
    ExternalUserMappingWithBalanceSchema,
    JiraWebhookRequest,
    JiraWebhookResponse,
    MarketingCreditJiraWebhookResponse,
    SbTechTokenRequest,
    TokenStorePayload,
    TokenStorePostResponse,
    TruNarrativeAscnWebhookRequest,
    TruNarrativeMssnWebhookRequest,
    TruNarrativeRsnWebhookRequest,
    TruNarrativeWebhookResponse,
    VirtualShopPaymentRequest,
    VirtualShopPaymentResponse,
)
from gmx_nifi_rest.services.http_service import (
    JiraHttpService,
    OidcHttpService,
    VirtualShopHttpService,
    WalletHttpService,
)
from gmx_nifi_rest.services.kafka_service import KafkaService
from gmx_nifi_rest.services.redis_service import RedisService
from gmx_nifi_rest.services.sbtech_service import SbTokenExchangeService

logger = logging.getLogger(__name__)


def check_token_prefix(token: SbTechTokenRequest) -> str:
    prefix = token.token[:3].lower()
    if prefix not in settings.SB_TECH_TOKEN_PREFIX_MAPPING:
        logger.error(
            "Prefix {} for SbToken({}...) not found. Configured prefixes: ".format(
                prefix, token.token[:30], settings.SB_TECH_TOKEN_PREFIX_MAPPING.keys()
            )
        )
        raise HTTPException(400, "Wrong token header")
    return prefix


async def token_exchange_for_user_info(company_name: str, token: str) -> ExternalUserBaseSchema:
    if not SbTokenExchangeService.is_valid(company_name):
        logger.error("Company({}) for token({}..) is unknown.".format(company_name, token[:30]))
        raise HTTPException(400, "Company for token is unknown")
    try:
        result = await SbTokenExchangeService.exchange(company_name, token)
    except SbTokenRefreshError:
        logger.warning("Unable to validate company({}) with token: {}".format(company_name, token[:30]))
        raise HTTPException(400, "Unable to verify token")
    return result


async def extract_company_name_and_token(token: SbTechTokenRequest) -> Tuple[str, str]:
    prefix = check_token_prefix(token)
    company_name = settings.SB_TECH_TOKEN_PREFIX_MAPPING.get(prefix)
    stripped_token = token.token[3:]
    return company_name, stripped_token


async def validate_and_extract_token_data(sb_token: str, value) -> ExternalUserBaseSchema:
    if sb_token is None or value is None:
        logger.warning("Wrong data")
        raise HTTPException(400, "Wrong data")

    token = SbTechTokenRequest(token=sb_token)
    company_name, stripped_token = await extract_company_name_and_token(token)
    external_user: ExternalUserBaseSchema = await token_exchange_for_user_info(company_name, stripped_token)
    return external_user


async def validate_and_get_tags_whitelist(company_id: str) -> list:
    tags_whitelist = await RedisService.get_tags_whitelist(company_id)

    if tags_whitelist is None or not tags_whitelist:
        async with await RedisService.get_lock(ARN.tags_whitelist(company_id=company_id)) as lock:
            assert lock.valid

            tags_whitelist = await RedisService.get_tags_whitelist(company_id)

            if tags_whitelist is None or not tags_whitelist:
                logger.info("Calling Virtual Shop for current tags whitelist.")
                tags_whitelist = await VirtualShopHttpService.get_tags_whitelist()
                logger.info("Received response - Tags Whitelist: {}".format(tags_whitelist))

                await RedisService.set_tags_whitelist(ujson.dumps(tags_whitelist), company_id)

    tags_names = list([_["name"] for _ in tags_whitelist])
    return tags_names


async def get_user_current_balance_from_company(
    external_user: ExternalUserMappingSchema, force_reload: bool = False
) -> Optional[Decimal]:
    user_sub = external_user.user_sub
    company_id = external_user.company_id
    current_balance: Decimal = None
    if not force_reload:
        current_balance: Decimal = await RedisService.get_user_current_balance(user_sub)
    if force_reload or current_balance is None:
        async with await RedisService.get_lock(ARN.user_current_balance(sub=user_sub)) as lock:
            assert lock.valid
            if not force_reload:
                current_balance: Decimal = await RedisService.get_user_current_balance(user_sub)
            if force_reload or current_balance is None:
                logger.info("Calling Wallet for current balance. {}".format(user_sub))
                current_balance = await WalletHttpService.get_balance_from_company(
                    user_sub=user_sub, company_id=company_id
                )
                logger.info("Received response - {} has {}".format(user_sub, current_balance))
                await RedisService.set_user_current_balance(user_sub, current_balance)
    return current_balance


async def get_external_user_mapping(company_name: str, token: str) -> ExternalUserMappingSchema:
    external_user: ExternalUserBaseSchema = await token_exchange_for_user_info(company_name, token)
    result = await RedisService.get_user_mapping(external_user=external_user)
    if result is None:
        async with await RedisService.get_lock(
            ARN.user_mapping(company_id=external_user.company_id, external_id=external_user.external_user_id)
        ) as lock:
            assert lock.valid
            result: ExternalUserMappingSchema = await RedisService.get_user_mapping(external_user=external_user)
            if result is None:
                logger.info("Calling OIDC mapping service from user sub. {}".format(external_user.dict()))
                result: ExternalUserMappingSchema = await OidcHttpService.get_external_user_mapping(
                    external_user=external_user
                )
                if result is None:
                    raise HTTPException(
                        status_code=500, detail="No mapping {} for {} - no response".format(company_name, token)
                    )
                logger.info("Received response - {}".format(result))
                await RedisService.set_user_mapping(result)
    if result.company_id is None:
        result.company_id = settings.SB_TECH_COMPANY_MAPPING.get(company_name)
    return result


async def get_external_user_current_balance_from_company(
    company_name, token, force_reload: bool = False
) -> Optional[ExternalUserMappingWithBalanceSchema]:
    if force_reload is None:
        force_reload = False
    external_user: ExternalUserMappingSchema = await get_external_user_mapping(company_name=company_name, token=token)
    balance: Decimal = await get_user_current_balance_from_company(external_user, force_reload=force_reload)
    if balance is None:
        raise HTTPException(
            status_code=500, detail="No mapping balance for user {} found - no response".format(external_user.user_sub)
        )

    result: ExternalUserMappingWithBalanceSchema = ExternalUserMappingWithBalanceSchema.from_external_user_mapping(
        external_user, balance
    )
    return result


async def virtual_shop_payment_from_company(
    company_name: str, payload: VirtualShopPaymentRequest
) -> VirtualShopPaymentResponse:
    assert company_name in settings.SB_TECH_COMPANY_MAPPING, "{} not in {} possible values".format(
        company_name, settings.SB_TECH_COMPANY_MAPPING
    )
    external_user: ExternalUserMappingSchema = await get_external_user_mapping(
        company_name=company_name, token=payload.token
    )
    temp_lock_arn = "pc:rest:virtual_shop_payment_from_company:{}".format(external_user.user_sub)
    async with await RedisService.get_lock(temp_lock_arn) as lock:
        assert lock.valid
        balance: Decimal = await get_user_current_balance_from_company(external_user, force_reload=True)
        price: Decimal = Decimal(payload.price)
        if balance < price:
            logger.warning(
                "User {} has {} points but order is for {} points. Raising INSUFFICIENT_FOUNDS".format(
                    external_user.user_sub, balance, price
                )
            )
            raise DirectHttpException(status_code=400, detail={"error_type": "INSUFFICIENT_FOUNDS"})
        process_id = "vsp-{}".format(uuid4().hex)
        data = KafkaService.Models.VirtualShopPayment(
            price=payload.price,
            title=payload.title,
            transaction_id=payload.transaction_id,
            process_id=process_id,
            originator_id=external_user.originator_id,
            user_sub=external_user.user_sub,
            external_user_id=external_user.external_user_id,
            company_id=external_user.company_id,
        )
        await KafkaService.send_virtual_shop_payment(data=data)
    result = VirtualShopPaymentResponse(
        process_id=process_id,
        user_sub=external_user.user_sub,
        originator_id=external_user.originator_id,
        external_user_id=external_user.external_user_id,
    )
    return result


async def virtual_shop_order_line_for_resolve(payload: JiraWebhookRequest) -> JiraWebhookResponse:
    payload_fields = payload.issue.get("fields")
    temp_lock_arn = "pc:rest:virtual_shop_order_line_resolve:{}".format(payload_fields.get("customfield_10856"))
    async with await RedisService.get_lock(temp_lock_arn) as lock:
        assert lock.valid
        if not payload_fields.get("customfield_10856"):
            msg = "Wrong webhook data. Please check JIRA TICKET"
            logger.warning(msg)
            raise DirectHttpException(status_code=400, detail={"error_type": msg})
        data = KafkaService.Models.VirtualShopOrderLineResolve(
            issue_id=payload.issue.get("id"),
            order_line_id=payload_fields.get("customfield_10856").split(":")[0],
            resolved_lines_array=payload_fields.get("customfield_10856").split(":")[1],
        )
        await KafkaService.send_virtual_shop_order_line(data=data)
    result = JiraWebhookResponse(updated=True)
    return result


async def verify_auto_documents_flow(payload: AutoDocVerifyRequest, retry: bool) -> AutoDocVerifyResponse:
    company_name, stripped_token = await extract_company_name_and_token(payload)
    external_user: ExternalUserMappingSchema = await get_external_user_mapping(
        company_name=company_name, token=stripped_token
    )
    external_user_id = external_user.external_user_id
    journey = payload.journey.value
    client_reference = prepare_tn_client_reference(external_user_id, journey)

    auto_doc_status: AutoDocVerifyResponse = await RedisService.get_user_tn_autodoc_status(client_reference)

    if auto_doc_status is None:
        async with await RedisService.get_lock(ARN.tn_autodoc(client_reference)) as lock:
            assert lock.valid
            new_auto_doc_status = AutoDocVerifyResponse(status=AutoDocStatusEnums.PREPARING_URL.value)
            await RedisService.set_user_tn_autodoc_status(client_reference, new_auto_doc_status)
            logger.info(
                f"[AutoDoc] Sending notification to NIFI to start AutoDoc process once again {client_reference}."
            )
            data_key = KafkaService.Models.AutoDocVerifyKey(externalUserId=external_user_id,)
            data = KafkaService.Models.AutoDocVerifyNotification(
                uuid=str(uuid4()),
                createdDateUTC=int(datetime.utcnow().timestamp() * 1000),
                companyId=settings.SB_TECH_COMPANY_MAPPING.get(company_name),
                externalUserId=client_reference,
                action=AutoDocNifiActionEnums.START_OVER_AGAIN.value,
                status=AutoDocStatusEnums.PREPARING_URL.value,
            )
            await KafkaService.send_autodoc_action(data=data, data_key=data_key, company_name=company_name)
            return new_auto_doc_status

    if auto_doc_status.status in (AutoDocStatusEnums.MANUAL_ACTION.value, AutoDocStatusEnums.DECLINE.value) and retry:
        await RedisService.delete_user_tn_autodoc_status(client_reference)
        await verify_auto_documents_flow(payload, retry=False)
        # Does SBToken will be still valid? Need to test.
    return auto_doc_status


async def mssn_webhook_handle(payload: TruNarrativeMssnWebhookRequest) -> TruNarrativeWebhookResponse:
    logger.info(f"[AutoDoc]Received MSSN webhook, payload: {payload}")
    client_reference = payload.clientReference

    async with await RedisService.get_lock(ARN.tn_autodoc(client_reference)) as lock:
        assert lock.valid
        auto_doc_status: AutoDocVerifyResponse = await RedisService.get_user_tn_autodoc_status(client_reference)
        if auto_doc_status and auto_doc_status.status == AutoDocStatusEnums.PREPARING_URL.value:
            new_auto_doc_status = AutoDocVerifyResponse(status=AutoDocStatusEnums.DOCS_BEING_PROCESSED.value)
            await RedisService.set_user_tn_autodoc_status(client_reference, new_auto_doc_status)

    return TruNarrativeWebhookResponse(updated=True)


async def rsn_webhook_handle(payload: TruNarrativeRsnWebhookRequest) -> TruNarrativeWebhookResponse:
    logger.info(f"[AutoDoc]Received RSN webhook, payload: {payload}")
    client_reference = payload.clientApplicationReference

    async with await RedisService.get_lock(ARN.tn_autodoc(client_reference)) as lock:
        assert lock.valid
        auto_doc_status: AutoDocVerifyResponse = await RedisService.get_user_tn_autodoc_status(client_reference)
        if auto_doc_status:
            new_auto_doc_status = AutoDocVerifyResponse(
                status=auto_doc_status.status,
                iframe_url=auto_doc_status.iframe_url,
                statusCode=auto_doc_status.statusCode,
                cacheStatus=auto_doc_status.cacheStatus,
                decision=auto_doc_status.decision,
                riskLevel=payload.riskLevel,
            )
            await RedisService.set_user_tn_autodoc_status(client_reference, new_auto_doc_status)

    return TruNarrativeWebhookResponse(updated=True)


async def ascn_webhook_handle(payload: TruNarrativeAscnWebhookRequest) -> TruNarrativeWebhookResponse:
    logger.info(f"[AutoDoc]Received ASCN webhook, payload: {payload}")
    account_reference = payload.accountReference
    client_reference = f"{account_reference}_{AutoDocJourneyTypeEnums.ID_POA.value}"
    company_name = "sport_nation"

    async with await RedisService.get_lock(ARN.tn_autodoc(client_reference)) as lock:
        assert lock.valid
        auto_doc_status: AutoDocVerifyResponse = await RedisService.get_user_tn_autodoc_status(client_reference)
        if payload.status.code == AutoDocStatusCodeEnums.REFERRED.value:
            new_auto_doc_status = AutoDocVerifyResponse(
                status=AutoDocStatusEnums.MANUAL_ACTION.value,
                iframe_url=auto_doc_status.iframe_url,
                statusCode=AutoDocStatusCodeEnums.REFERRED.value,
                cacheStatus=auto_doc_status.cacheStatus,
                decision=auto_doc_status.decision,
                riskLevel=auto_doc_status.riskLevel,
            )
            await RedisService.set_user_tn_autodoc_status(client_reference, new_auto_doc_status)

        elif payload.status.code == AutoDocStatusCodeEnums.COMPLETE.value:
            if payload.decision.code == AutoDocDecisionEnums.ACCEPT.value:
                new_status = AutoDocStatusEnums.ACCEPTED.value
                new_decision = AutoDocDecisionEnums.ACCEPT.value
                new_action = AutoDocNifiActionEnums.VERIFY_CUSTOMER.value
            else:
                new_status = AutoDocStatusEnums.DECLINE.value
                new_decision = AutoDocDecisionEnums.DECLINE.value
                new_action = AutoDocNifiActionEnums.DECLINE_CUSTOMER.value

            new_auto_doc_status_accept = AutoDocVerifyResponse(
                status=new_status,
                statusCode=AutoDocStatusCodeEnums.COMPLETE.value,
                decision=new_decision,
                riskLevel=auto_doc_status.riskLevel,
            )
            await RedisService.set_user_tn_autodoc_status(client_reference, new_auto_doc_status_accept)
            logger.info(f"[AutoDoc]Sending notification to NIFI for {new_action} {account_reference}.")
            data_key = KafkaService.Models.AutoDocVerifyKey(externalUserId=account_reference,)
            data = KafkaService.Models.AutoDocVerifyNotification(
                uuid=str(uuid4()),
                createdDateUTC=int(datetime.utcnow().timestamp() * 1000),
                companyId=settings.SB_TECH_COMPANY_MAPPING.get(company_name),
                externalUserId=client_reference,
                action=new_action,
                status=new_status,
            )
            await KafkaService.send_autodoc_action(data=data, data_key=data_key, company_name=company_name)

    return TruNarrativeWebhookResponse(updated=True)


async def validate_csv_and_topup_user(payload: JiraWebhookRequest) -> MarketingCreditJiraWebhookResponse:
    payload_fields = payload.issue.get("fields")
    key = payload.issue.get("id")
    bonus_code = payload_fields.get("customfield_10858")
    bonus_date = payload_fields.get("customfield_10863")
    brand = payload_fields.get("customfield_10872").get("value")
    attachment = payload_fields.get("attachment")

    if attachment:
        file_id = attachment[0].get("id")
        csv_file_url = attachment[0].get("content")
    else:
        file_id = None
        csv_file_url = None

    result = MarketingCreditJiraWebhookResponse(updated=True)
    temp_lock_arn = "pc:rest:wallet_top_up:{}".format(key)
    async with await RedisService.get_lock(temp_lock_arn) as lock:
        assert lock.valid
        try:
            if not csv_file_url or not bonus_code or not bonus_date or not brand:
                msg = await jira_ticket_handling(4, key, file_id)
                logger.error(msg)
                raise ValidationError({"msg": msg})

            bonus_date = bonus_date[:-9]
            bonus_date_for_id = datetime.strptime(bonus_date, "%Y-%m-%dT%H:%M:%S").strftime("%Y-%m-%d")
            created_date = time.mktime(datetime.strptime(bonus_date, "%Y-%m-%dT%H:%M:%S").timetuple())

            bonus_code = bonus_code.lower()

            bet_id_template = "bonus-{bonus_code}-{{customer_id}}-direct-{bonus_date}".format(
                bonus_code=bonus_code, bonus_date=bonus_date
            )
            title = "Direct Bonus for Campaign: {} on {}".format(bonus_code, bonus_date_for_id)
            brand = brand.split(" ")
            brand = "_".join(brand).lower()

            validated_lines, count = await validate_top_up_csv_file(csv_file_url, file_id, key)

            for line in validated_lines:
                data = KafkaService.Models.WalletTopUp(
                    external_user_id=line.customer_id,
                    external_transaction_id=bet_id_template.format(customer_id=line.customer_id),
                    amount=float(line.points),
                    title=title,
                    created_date=int(created_date),
                    created_date_value=bonus_date,
                    company_id=settings.SB_TECH_COMPANY_MAPPING.get(brand),
                    operation_subtype="BPG",
                    context_data={},
                )
                await KafkaService.send_wallet_top_up(data=data)

            await JiraHttpService.add_jira_comment(
                key=key, data=f'{title} -- DONE.\n {count} - user{"" if count < 2 else "s"} received points.'
            )
            transition = settings.JIRA_TRANSITION_IN_REVIEW
            await JiraHttpService.change_jira_transitions(key=key, data=transition)
        except ValidationError:
            pass
        except Exception as e:
            logger.exception(e)
    return result


async def get_stored_test_token(key: str):
    if not key:
        msg = "Invalid request data!"
        logger.error(msg)
        raise HTTPException(400, msg)
    result = await RedisService.get_store_token(key)
    if result is None:
        msg = "Data not exist!"
        logger.error(msg)
        raise HTTPException(404, msg)
    return result


async def store_test_token(payload: TokenStorePayload) -> TokenStorePostResponse:
    result = TokenStorePostResponse(updated=True)
    key = payload.key
    token = payload.token
    if not key and not token:
        msg = "Invalid request data!"
        logger.error(msg)
        raise HTTPException(400, msg)

    async with await RedisService.get_lock(ARN.test_token_key(key=key)) as lock:
        assert lock.valid
        logger.info("Storing new test token - {}".format(key))
        await RedisService.set_store_token(key, token)

    return result


async def validate_and_add_tag_for_user(payload: ATMAddTagRequest, fs_message_api_id: str) -> ATMAddTagResponse:
    sb_token = payload.sb_token
    tags = payload.tags

    external_user = await validate_and_extract_token_data(sb_token, tags)
    company_id = external_user.company_id

    tags_names = await validate_and_get_tags_whitelist(company_id)
    added_tags = []
    tags_not_validated = []

    for tag in tags:
        if tag in tags_names:
            data = KafkaService.Models.TagManagerStateChange(
                uuid=str(uuid4()),
                createdDateUTC=int(datetime.utcnow().timestamp() * 1000),
                companyId=external_user.company_id,
                externalUserId=external_user.external_user_id,
                userId=None,
                email=external_user.email,
                action=settings.KAFKA.TOPICS_CONFIG.CHANGE_STATE_OPERATION_TYPE_TAG,
                operationTrigger=settings.KAFKA.FRONT_END_TRIGGER,
                operationTarget=settings.KAFKA.SBTECH_TARGET,
                payload={"value": tag, "operationKind": settings.KAFKA.ADD},
            )
            data_key = KafkaService.Models.TagManagerStateChangeKey(externalUserId=external_user.external_user_id,)

            await KafkaService.send_tag_manager_state_change(
                data=data, data_key=data_key, company_name=external_user.company_name
            )
            logger.info(
                "FS-Message-Api-Id({}) published data on kafka for {} at {} with action={}".format(
                    fs_message_api_id,
                    external_user.external_user_id,
                    external_user.company_name,
                    settings.KAFKA.TOPICS_CONFIG.CHANGE_STATE_OPERATION_TYPE_TAG,
                )
            )
            added_tags.append(tag)
        else:
            tags_not_validated.append(tag)

    result = ATMAddTagResponse(added_tags=added_tags, tags_not_validated=tags_not_validated)
    return result


async def validate_and_add_note_for_user(payload: ATMAddNoteRequest, fs_message_api_id: str) -> ATMAddNoteResponse:
    sb_token = payload.sb_token
    note = payload.note

    external_user = await validate_and_extract_token_data(sb_token, note)

    data = KafkaService.Models.TagManagerStateChange(
        uuid=str(uuid4()),
        createdDateUTC=int(datetime.utcnow().timestamp() * 1000),
        companyId=external_user.company_id,
        externalUserId=external_user.external_user_id,
        userId=None,
        email=external_user.email,
        action=settings.KAFKA.TOPICS_CONFIG.CHANGE_STATE_OPERATION_TYPE_NOTE,
        operationTrigger=settings.KAFKA.FRONT_END_TRIGGER,
        operationTarget=settings.KAFKA.SBTECH_TARGET,
        payload={"value": note, "operationKind": settings.KAFKA.ADD},
    )
    data_key = KafkaService.Models.TagManagerStateChangeKey(externalUserId=external_user.external_user_id)

    await KafkaService.send_tag_manager_state_change(
        data=data, data_key=data_key, company_name=external_user.company_name
    )
    logger.info(
        "FS-Message-Api-Id({}) published data on kafka for {} at {} with action={}".format(
            fs_message_api_id,
            external_user.external_user_id,
            external_user.company_name,
            settings.KAFKA.TOPICS_CONFIG.CHANGE_STATE_OPERATION_TYPE_NOTE,
        )
    )

    result = ATMAddNoteResponse(added_note=True)
    return result


async def validate_and_add_jira_for_user(payload: ATMAddJiraRequest, fs_message_api_id: str) -> ATMAddJiraResponse:
    sb_token = payload.sb_token
    jira_tag = payload.jira_tag
    jira_issue_type = payload.jira_issue_type

    external_user = await validate_and_extract_token_data(sb_token, jira_tag)
    action = settings.KAFKA.TOPICS_CONFIG.CHANGE_STATE_OPERATION_TYPE_JIRA

    data = KafkaService.Models.TagManagerStateChange(
        uuid=str(uuid4()),
        createdDateUTC=int(datetime.utcnow().timestamp() * 1000),
        companyId=external_user.company_id,
        externalUserId=external_user.external_user_id,
        userId=None,
        email=external_user.email,
        action=action,
        operationTrigger=settings.KAFKA.FRONT_END_TRIGGER,
        operationTarget=settings.KAFKA.GMX_TARGET,
        payload={
            "value": {"jira_tag": jira_tag, "jira_issue_type": jira_issue_type},
            "operationKind": settings.KAFKA.ADD,
        },
    )
    data_key = KafkaService.Models.TagManagerStateChangeKey(externalUserId=external_user.external_user_id)

    await KafkaService.send_tag_manager_state_change(
        data=data, data_key=data_key, company_name=external_user.company_name
    )
    logger.info(
        "FS-Message-Api-Id({}) published data on kafka for {} at {} with action={}".format(
            fs_message_api_id, external_user.external_user_id, external_user.company_name, action,
        )
    )

    result = ATMAddJiraResponse(added_jira=True)
    return result
