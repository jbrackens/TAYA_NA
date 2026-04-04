import logging
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel

from gmx_nifi_rest import settings
from gmx_nifi_rest.enums import (
    AutoDocDecisionEnums,
    AutoDocJourneyTypeEnums,
    AutoDocRiskLevelEnums,
    AutoDocStatusCodeEnums,
)

logger = logging.getLogger(__name__)


class ARN:
    @staticmethod
    def user_current_balance(sub: str) -> str:
        return "arn:wallet:current_balance:{}".format(sub)

    @staticmethod
    def user_mapping(company_id: str, external_id: str) -> str:
        return "arn:user_map:{}:{}".format(company_id, external_id)

    @staticmethod
    def user_originator(sub: str) -> str:
        return "arn:user:originator:{}".format(sub)

    @staticmethod
    def test_token_key(key: str) -> str:
        return "arn:test:token:{}".format(key)

    @staticmethod
    def tags_whitelist(company_id: str) -> str:
        return "arn:tags:whitelist:{}".format(company_id)

    @staticmethod
    def avro_schema(subject: str) -> str:
        return "arn:avro:schema:{}".format(subject)

    @staticmethod
    def tn_autodoc(client_reference: str) -> str:
        return f"arn:rest:tn_autodoc:client:reference:{client_reference}"


class SbTechTokenExchangeResponse(BaseModel):
    """ Result from SBTech API """

    email: str
    firstName: str
    ID: str


class ExternalUserBaseSchema(BaseModel):
    email: Optional[str]
    first_name: Optional[str]
    display_name: Optional[str]
    external_user_id: str
    company_name: str
    company_id: str

    def get_arn_mapping(self) -> str:
        return ARN.user_mapping(self.company_id, self.external_user_id)

    @classmethod
    def from_sbtech_token_response(
        cls, response: SbTechTokenExchangeResponse, company_name: str
    ) -> "ExternalUserBaseSchema":
        if company_name not in settings.SB_TECH_COMPANY_MAPPING:
            raise ValueError('No company name "{}" found in {}'.format(company_name, settings.SB_TECH_COMPANY_MAPPING))
        return cls(
            external_user_id=response.ID,
            company_name=company_name,
            company_id=settings.SB_TECH_COMPANY_MAPPING.get(company_name),
            email=response.email,
            first_name=response.firstName,
            display_name=response.firstName,
        )


class ExternalUserMappingSchema(ExternalUserBaseSchema):
    user_sub: str
    originator_id: Optional[str]

    @classmethod
    def from_external_user(
        cls, external_user: ExternalUserBaseSchema, user_sub: str, originator_id: Optional[str] = None
    ) -> "ExternalUserMappingSchema":
        return cls(user_sub=user_sub, originator_id=originator_id, **external_user.dict())


class ExternalUserMappingWithBalanceSchema(ExternalUserMappingSchema):
    current_balance: Decimal

    @classmethod
    def from_external_user_mapping(
        cls, external_user: ExternalUserMappingSchema, current_balance: Decimal
    ) -> "ExternalUserMappingWithBalanceSchema":
        return cls(current_balance=current_balance, **external_user.dict())


class CurrentBalanceWithSilentPaymentTokenResponse(BaseModel):
    display_name: str
    current_balance: str
    payment_token: str

    @classmethod
    def create_from_external_user_mapping_with_balance_schema(
        cls, data: ExternalUserMappingWithBalanceSchema
    ) -> "CurrentBalanceWithSilentPaymentTokenResponse":
        from gmx_nifi_rest.services.secret_box import SecretBoxService

        return cls(
            display_name=data.first_name,
            current_balance=data.current_balance,
            payment_token=SecretBoxService.calculate_payment_token(
                valid_time=60 * 60 * 2,  # 2 hours
                company_id=data.company_id,
                user_sub=data.user_sub,
                external_user_id=data.external_user_id,
                first_name=data.first_name,
            ),
        )


class SbTechTokenRequest(BaseModel):
    token: str


class SbTechTokenForCurrentBalanceRequest(SbTechTokenRequest):
    force_reload: Optional[bool]


class SbTechCasino2amConsentRequest(SbTechTokenRequest):
    casino_2am_consent: bool


class VirtualShopPaymentRequest(SbTechTokenRequest):
    price: str
    title: str
    transaction_id: str


class VirtualShopPaymentResponse(BaseModel):
    process_id: str
    originator_id: str
    user_sub: str
    external_user_id: str


class AutoDocVerifyRequest(SbTechTokenRequest):
    journey: AutoDocJourneyTypeEnums


class AutoDocVerifyDetails(BaseModel):
    iframe_url: Optional[str]
    statusCode: Optional[AutoDocStatusCodeEnums]
    cacheStatus: Optional[str]
    decision: Optional[AutoDocDecisionEnums]
    riskLevel: Optional[AutoDocRiskLevelEnums]


class AutoDocVerifyResponse(BaseModel):
    status: str
    iframe_url: Optional[str]
    statusCode: Optional[str]
    cacheStatus: Optional[str]
    decision: Optional[str]
    riskLevel: Optional[str]


class TokenData(BaseModel):
    sub: str
    is_limited: bool
    originator: str
    permissions: List[str]
    audience_sub: str


class JiraWebhookRequest(BaseModel):
    issue: dict


class JiraWebhookResponse(BaseModel):
    updated: bool


class MarketingCreditJiraWebhookResponse(BaseModel):
    updated: bool


class TruNarrativeMssnWebhookRequest(BaseModel):
    module: str
    auditRef: str
    entityName: str
    clientReference: str
    journeyRef: str
    nextAuditRef: str
    date: str
    documents: List


class TruNarrativeAscnWebhookStatus(BaseModel):
    code: str
    label: str


class TruNarrativeAscnWebhookDecision(BaseModel):
    code: Optional[str]
    label: Optional[str]


class TruNarrativeAscnWebhookRequest(BaseModel):
    accountId: str
    accountReference: str
    name: str
    date: str
    status: TruNarrativeAscnWebhookStatus
    decision: TruNarrativeAscnWebhookDecision


class TruNarrativeRsnWebhookRequest(BaseModel):
    clientApplicationReference: str
    riskLevel: str


class TruNarrativeWebhookResponse(BaseModel):
    updated: bool


class TokenStorePostResponse(BaseModel):
    updated: bool


class TokenStorePayload(BaseModel):
    key: str
    token: str


class ATMAddTagRequest(BaseModel):
    sb_token: str
    tags: List[str]


class ATMAddTagResponse(BaseModel):
    added_tags: Optional[List[str]]
    tags_not_validated: Optional[List[str]]


class ATMAddNoteRequest(BaseModel):
    sb_token: str
    note: str


class ATMAddNoteResponse(BaseModel):
    added_note: bool


class ATMAddJiraRequest(BaseModel):
    sb_token: str
    jira_tag: str
    jira_issue_type: str


class ATMAddJiraResponse(BaseModel):
    added_jira: bool


class HealthCheckStatusRow(BaseModel):
    name: str
    status: bool
    details: Optional[str]


class HealthCheckStatus(BaseModel):
    details: List[HealthCheckStatusRow]
