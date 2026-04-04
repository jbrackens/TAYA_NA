import os
from .S3DataReader import S3DataReader
from .FileDataReader import FileDataReader

data_reader = eval(os.environ.get('DATA_READER_CLASS', 'FileDataReader'))()
