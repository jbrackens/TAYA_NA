import collections
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from functools import partial
from typing import Optional
from uuid import UUID

import pytz
from dataclasses_json import DataClassJsonMixin, LetterCase, Undefined, config, dataclass_json
from dataclasses_json.cfg import config as json_config
from marshmallow import fields

datetime_metadata_field = partial(
    config,
    encoder=lambda x: None if x is None else x.isoformat(),
    decoder=lambda x: None if not x else datetime.fromisoformat(x),
    mm_field=fields.Integer(),
)


@dataclass_json(letter_case=LetterCase.CAMEL, undefined=Undefined.RAISE)
@dataclass
class EventField:
    class ValueTypeEnum(Enum):
        BOOLEAN = "boolean"
        STRING = "string"
        INTEGER = "integer"
        FLOAT = "float"

    name: str
    value_type: ValueTypeEnum
    value: str


EventFieldSchema = EventField.schema()


class EventPayload(DataClassJsonMixin):
    # noinspection PyTypeChecker
    dataclass_json_config = json_config(letter_case=LetterCase.CAMEL, undefined=Undefined.RAISE)[
        "dataclasses_json"
    ]  # noqa
    _message_type: str = field(init=False)

    @classmethod
    def get_message_type(cls):
        return cls._message_type

    @staticmethod
    def flatten(dictionary, parent_key=False, separator="."):
        items = []
        for key, value in dictionary.items():
            new_key = str(parent_key) + separator + key if parent_key else key
            if isinstance(value, collections.MutableMapping):
                items.extend(EventPayload.flatten(value, new_key, separator).items())
            elif isinstance(value, list):
                for k, v in enumerate(value):
                    items.extend(EventPayload.flatten({str(k): v}, new_key).items())
            else:
                items.append((new_key, value))
        return dict(items)

    def to_dict(self, encode_json=False):
        proposal = super().to_dict(encode_json=encode_json)  # noqa
        flattened = EventPayload.flatten(proposal)
        result = list()
        for k, v in flattened.items():
            if v is None:
                continue
            if isinstance(v, float):
                value_type = EventField.ValueTypeEnum.FLOAT
                value = str(v)
            elif isinstance(v, int):
                value_type = EventField.ValueTypeEnum.INTEGER
                value = str(v)
            elif isinstance(v, (str, UUID)):
                value_type = EventField.ValueTypeEnum.STRING
                value = str(v)
            elif isinstance(v, bool):
                value_type = EventField.ValueTypeEnum.BOOLEAN
                value = str(v)
            elif isinstance(v, Enum):
                value_type = EventField.ValueTypeEnum.STRING
                value = v.value
            else:
                raise ValueError(f"Unknown type '{type(v)}' for key: '{k}'")
            result.append(EventField(name=k, value=value, value_type=value_type).to_dict(encode_json=encode_json))
        return result


@dataclass_json(letter_case=LetterCase.CAMEL, undefined=Undefined.RAISE)
@dataclass
class SubscriptionMetaSchema:
    class SubscriptionTypesEnum(Enum):
        MINUTE = "MINUTE"
        HOUR = "HOUR"
        DAY = "DAY"
        WEEK = "WEEK"
        MONTH = "MONTH"
        YEAR = "YEAR"

    subscription_type: SubscriptionTypesEnum
    duration: int
    level: int = 1


@dataclass_json(letter_case=LetterCase.CAMEL, undefined=Undefined.RAISE)
@dataclass
class ProductSchema:
    class ProductTypesEnum(Enum):
        BASE = "BASE"
        SUBSCRIPTION = "SUBSCRIPTION"
        CONSUMABLE = "CONSUMABLE"

    class ProductSubTypesEnum(Enum):
        NORMAL = "NORMAL"
        VIRTUAL = "VIRTUAL"

    class ProvisionTypesEnum(Enum):
        NONE = "NONE"
        ANTSTREAM = "ANTSTREAM"

    product_id: UUID
    product_type: ProductTypesEnum
    sub_type: ProductSubTypesEnum
    provision_type: ProvisionTypesEnum
    title: str
    price: float  # using float because "decimal" will be represented as string
    currency_id: UUID
    company_id: UUID
    is_public: bool
    subscription_meta: Optional[SubscriptionMetaSchema] = None
    commercially_available_from: Optional[datetime] = field(
        metadata=datetime_metadata_field(field_name="commerciallyAvailableFromDateUTC"), default=None
    )
    commercially_available_to: Optional[datetime] = field(
        metadata=datetime_metadata_field(field_name="commerciallyAvailableToDateUTC"), default=None
    )


@dataclass
class ProductCreatedEvent(EventPayload):
    _message_type = "internal.virtualStore.ProductCreated"
    product: ProductSchema


@dataclass
class ProductUpdatedEvent(EventPayload):
    _message_type = "internal.virtualStore.ProductUpdated"
    product: ProductSchema


@dataclass
class ProductAddedToBackpackEvent(EventPayload):
    _message_type = "internal.userBackpack.ProductAdded"
    product_id: UUID


@dataclass
class ProductActivatedInBackpackEvent(EventPayload):
    _message_type = "internal.userBackpack.ProductActivated"
    product_id: UUID
    active_to: Optional[datetime] = field(metadata=datetime_metadata_field(field_name="activeToDateUTC"))


@dataclass
class ProductDeactivatedInBackpackEvent(EventPayload):
    _message_type = "internal.userBackpack.ProductDeactivated"
    product_id: UUID


@dataclass
class ProductDetachedFromBackpackEvent(EventPayload):
    _message_type = "internal.userBackpack.ProductDetached"
    product_id: UUID


@dataclass
class IncomingAdminAnyEvent(DataClassJsonMixin):
    # noinspection PyTypeChecker
    dataclass_json_config = json_config(letter_case=LetterCase.CAMEL, undefined=Undefined.RAISE)[
        "dataclasses_json"
    ]  # noqa

    class SourceEnum(Enum):
        INTERNAL = "internal"
        EXTERNAL = "external"

    payload: EventPayload

    message_origin_date: datetime = field(
        metadata=datetime_metadata_field(field_name="messageOriginDateUTC"),
        default_factory=lambda: datetime.now(tz=pytz.UTC),
    )
    message_type: str = field(init=False)
    on_behalf_of_company_id: Optional[UUID] = None
    on_behalf_of_user_id: Optional[str] = None
    source: SourceEnum = SourceEnum.INTERNAL

    def to_dict(self, encode_json=False):
        self.message_type = self.payload.get_message_type()
        result = super().to_dict(encode_json=encode_json)
        result["payload"] = self.payload.to_dict(encode_json=encode_json)
        return result
