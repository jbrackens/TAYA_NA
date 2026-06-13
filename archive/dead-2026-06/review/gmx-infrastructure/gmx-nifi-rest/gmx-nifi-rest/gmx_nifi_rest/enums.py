from enum import Enum


class AutoDocStatusEnums(str, Enum):
    PREPARING_URL = "PREPARING_URL"
    URL_READY = "URL_READY"
    DOCS_BEING_PROCESSED = "DOCS_BEING_PROCESSED"
    MANUAL_ACTION = "MANUAL_ACTION"
    ACCEPTED = "ACCEPTED"
    DECLINE = "DECLINE"
    UNKNOWN = "UNKNOWN"


class AutoDocStatusCodeEnums(str, Enum):
    REFERRED = "REFERRED"
    COMPLETE = "COMPLETE"
    AWAITING_RESPONSE = "AWAITING_RESPONSE"


class AutoDocDecisionEnums(str, Enum):
    ACCEPT = "ACCEPT"
    DECLINE = "DECLINE"


class AutoDocRiskLevelEnums(str, Enum):
    ID_PASS = "ID Pass"
    ID_NOT_MATCH = "ID Not Match"


class AutoDocJourneyTypeEnums(str, Enum):
    ID = "ID"
    ID_SELFIE = "ID+SELFIE"
    ID_POA = "ID+POA"


class AutoDocNifiActionEnums(str, Enum):
    START_OVER_AGAIN = "START_OVER_AGAIN"
    VERIFY_CUSTOMER = "VERIFY_CUSTOMER"
    DECLINE_CUSTOMER = "DECLINE_CUSTOMER"
