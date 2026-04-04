import enum
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

import orjson
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel

from user_context import settings


class ARN:
    @staticmethod
    def user_mapping(company_id: str, external_id: str) -> str:
        return "arn:user_map:{}:{}".format(company_id, external_id)

    @staticmethod
    def user_originator(sub: str) -> str:
        return "arn:user:originator:{}".format(sub)

    @staticmethod
    def avro_schema(subject: str) -> str:
        return "arn:avro:schema:{}".format(subject)


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
    def from_sbtech_token_response(cls, response, company_name: str) -> "ExternalUserBaseSchema":
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


class UserContextBaseSchema(BaseModel):
    def json_bytes(self, *args, **kwargs) -> bytes:
        value = super().dict(*args, **kwargs)
        value = jsonable_encoder(value)
        return orjson.dumps(value)

    def json(self, *args, **kwargs) -> str:
        value = super().dict(*args, **kwargs)
        value = jsonable_encoder(value)
        return orjson.dumps(value).decode()

    class Config:
        json_loads = orjson.loads
        json_dumps = orjson.dumps


class SchemaInDbMixing(BaseModel):
    id: int
    created_at: datetime
    updated_at: datetime
    is_deleted: bool
    deleted_at: Optional[datetime]

    class Config:
        orm_mode = True
        json_loads = orjson.loads
        json_dumps = orjson.dumps


class StatusEnum(str, enum.Enum):
    OK = "ok"
    ERROR = "error"


class SuccessResponseSchema(UserContextBaseSchema):
    status: StatusEnum
    details: Optional[dict]


class ServiceStatus(UserContextBaseSchema):
    status: StatusEnum
    data: Optional[str]


class HealthCheckSchema(UserContextBaseSchema):
    status: StatusEnum
    services: Dict[str, ServiceStatus]


class HealthCheckStatusRow(BaseModel):
    name: str
    status: bool
    details: Optional[str]


class HealthCheckStatus(BaseModel):
    details: List[HealthCheckStatusRow]


class TokenData(BaseModel):
    sub: str
    is_limited: bool
    originator: str
    permissions: List[str]
    audience_sub: str
    is_test_user: str


class ErrorResponseSchema(UserContextBaseSchema):
    details: str


def generate_uuid(value: Any) -> UUID:
    if not value:
        return uuid4()
    return value
