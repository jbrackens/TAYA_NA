import io
from .DataReader import DataReader


class FileDataReader(DataReader):
    def __init__(self, *args, **kwargs):
        super(FileDataReader, self).__init__(*args, **kwargs)
        pass

    def get_data(self, *args, **kwargs):
        with open('temp/{}'.format(kwargs.get('key')), 'rb') as f:
            return f.read()
