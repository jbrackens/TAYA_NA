import os


class OperatorRmxCodes:
    SPORTNATION = os.environ.get('SN_RMX_COMPANY_ID', None)
    REDZONESPORTS = os.environ.get('RZS_RMX_COMPANY_ID', None)
    GIVEMEBET = os.environ.get('GIVEMEBET_COMPANY_ID', None)

    @classmethod
    def __getitem__(cls, item):
        return getattr(cls, item.replace(' ', '').upper())
