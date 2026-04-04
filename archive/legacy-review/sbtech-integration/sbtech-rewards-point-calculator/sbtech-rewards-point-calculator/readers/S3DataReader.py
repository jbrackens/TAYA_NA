from .DataReader import DataReader
from connectors import s3
import io


class S3DataReader(DataReader):
    def __init__(self, *args, **kwargs):
        super(S3DataReader, self).__init__(*args, **kwargs)

    def get_data(self, *args, **kwargs):
        response = s3.get_object(Bucket=kwargs.get('bucket'), Key=kwargs.get('key'))
        return io.BytesIO(response['Body'].read())
