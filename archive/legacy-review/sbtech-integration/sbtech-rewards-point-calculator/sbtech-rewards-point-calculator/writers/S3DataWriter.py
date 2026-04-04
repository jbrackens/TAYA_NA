from .DataWriter import DataWriter
from connectors import s3


class S3DataWriter(DataWriter):
    def save(self, *args, **kwargs):
        pass
