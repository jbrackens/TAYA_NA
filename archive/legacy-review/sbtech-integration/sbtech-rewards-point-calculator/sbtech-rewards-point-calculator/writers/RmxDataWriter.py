from .DataWriter import DataWriter
from connectors import rmx


class RmxDataWriter(DataWriter):
    ENDPOINT = ''
    BUFFER_SIZE = 10
    EXPECTED_RESPONSE_STATUS_CODE = 200

    def __init__(self, *args, **kwargs):
        super(RmxDataWriter, self).__init__(*args, **kwargs)

    def __enter__(self):
        self.items = []

        return self

    def add(self, item, *args, **kwargs):
        super(RmxDataWriter, self).add(item=item)

        if len(self.items) >= self.BUFFER_SIZE:
            self.save()
            self.items = []

    def save(self, *args, **kwargs):
        if len(self.items) != 0:
            response = rmx.send(
                api_method=self.ENDPOINT,
                payload=self.items,
                expected_status_code=self.EXPECTED_RESPONSE_STATUS_CODE
            )

            self._process_stats(response=response)

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.save()
        self._write_stats()
