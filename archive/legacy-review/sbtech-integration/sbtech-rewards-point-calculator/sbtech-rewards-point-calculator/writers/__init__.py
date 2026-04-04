import os

from .FileDataWriter import FileDataWriter
from .RmxDataWriter import RmxDataWriter
from .S3DataWriter import S3DataWriter
from .PuntersRmxDataWriter import PuntersRmxDataWriter
from .TopupRmxDataWriter import TopupRmxDataWriter
from .BuyProductRmxDataWriter import BuyProductRmxDataWriter
from .CsvFileDataWriter import CsvFileDataWriter


def create_writer(*args, **kwargs):
    return eval(os.environ.get('DATA_WRITER_CLASS', 'FileDataWriter'))()
