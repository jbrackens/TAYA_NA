import json
from time import sleep
from .DataWriter import DataWriter
from connectors import rmx


class BuyProductRmxDataWriter(DataWriter):
    ENDPOINT = 'buy_product'
    BUFFER_SIZE = 10
    EXPECTED_RESPONSE_STATUS_CODE = 201

    def __init__(self, *args, **kwargs):
        super(BuyProductRmxDataWriter, self).__init__(*args, **kwargs)

    def __enter__(self):
        self.items = []
        self.responses = []

        return self

    def _process_stats(self, *args, **kwargs):
        self.responses.append(kwargs.get('response'))

    def _write_stats(self, *args, **kwargs):
        with open('output/responses.json', 'w') as f:
            json.dump(self.responses, f, indent=2)

    def add(self, item, *args, **kwargs):
        super(BuyProductRmxDataWriter, self).add(item=item)

        if len(self.items) >= self.BUFFER_SIZE:
            self.save()
            self.items = []

    def save(self, *args, **kwargs):
        if len(self.items) != 0:

            for item in self.items:
                response = rmx.send(
                    api_method='get_or_create_user',
                    expected_status_code=200,
                    retry=False,
                    payload={
                        'external_user_id': item.get('for_user'),
                        'company_id': item.get('company_id')
                    }
                )
                self._process_stats(response=response)

                item['for_user'] = response.get('user_sub')
                del item['company_id']

                response = rmx.send(
                    api_method=self.ENDPOINT,
                    payload=item,
                    retry=False,
                    expected_status_code=self.EXPECTED_RESPONSE_STATUS_CODE
                )
                self._process_stats(response=response)

                sleep(1)  # so we do not block the service

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.save()
        self._write_stats()
