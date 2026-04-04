import arrow
import os
import pyexcel
from exceptions import ExceptionBetProcessingFailed
from readers import data_reader


class Parser:
    ENCODING = 'utf-8'

    def __init__(self, *args, **kwargs):
        self.key = kwargs['event']['Records'][0]['s3']['object']['key']
        self.bucket = kwargs['event']['Records'][0]['s3']['bucket']['name']
        self.date = self.key.split('_')[-1].split('.')[0]
        filename, file_extension = os.path.splitext(self.key)

        try:
            data = data_reader.get_data(bucket=self.bucket, key=self.key)
            self.rows = pyexcel.iget_records(
                file_type=(file_extension[1:]).lower(),
                file_content=data,
                encoding=self.ENCODING,
                skip_empty_rows=True
            )
        except Exception as e:
            raise ExceptionBetProcessingFailed()

        pass

    def get_items(self):
        pass
