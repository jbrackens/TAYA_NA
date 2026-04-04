import pyexcel
from .DataWriter import DataWriter


class CsvFileDataWriter(DataWriter):
    PATH = 'output/result.csv'

    def __enter__(self):
        super(CsvFileDataWriter, self).__enter__()

        return self

    def save(self, *args, **kwargs):
        if len(self.items) != 0:
            pyexcel.save_as(records=self.items, dest_file_name=self.PATH)

            self.items = []

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.save()
        self.items = []
