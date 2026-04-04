import os
from .PuntersParser import PuntersParser
from .BetsParser import BetsParser
from .CasinoGroupedParser import CasinoGroupedParser
from .OlapParser import OlapParser
from .DirectBonusParser import DirectBonusParser
from .BuyProductParser import BuyProductParser
from .RefundParser import RefundParser
from .TestTopupParser import TestTopupParser
from .PuntersChameleonParser import PuntersChameleonParser
from exceptions import ExceptionParserNotImplemented


def create_parser(*args, **kwargs):
    key = kwargs['event']['Records'][0]['s3']['object']['key']
    parser = key.split('-')[0]

    try:
        return eval("{}Parser".format(parser))
    except Exception as e:
        raise ExceptionParserNotImplemented()
