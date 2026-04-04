import json
from .DataWriter import DataWriter


class FileDataWriter(DataWriter):
    PATH = 'output/data.json'

    def __enter__(self):
        self.items = []
        self.file = open(self.PATH, 'w+')

        return self

    def save(self, *args, **kwargs):
        if len(self.items) != 0:
            self.file.write(json.dumps(self.items, indent=4))
            self.items = []

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.save()
        self.items = []
        self.file.close()
