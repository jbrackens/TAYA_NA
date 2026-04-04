import json
from .RmxDataWriter import RmxDataWriter


class PuntersRmxDataWriter(RmxDataWriter):
    ENDPOINT = 'get_or_create_users'
    BUFFER_SIZE = 500
    EXPECTED_RESPONSE_STATUS_CODE = 201

    def __enter__(self):
        super(PuntersRmxDataWriter, self).__enter__()

        self.items = []
        self.rejected = []
        self.processed = []
        self.statistic = {'rejected': 0, 'processed': 0, 'skipped': 0}

        return self

    def _process_stats(self, *args, **kwargs):
        response = kwargs.get('response')

        self.rejected += response.get('rejected')
        self.statistic['rejected'] += len(response.get('rejected'))
        self.statistic['processed'] += len(response.get('processed'))
        self.statistic['skipped'] += len(response.get('skipped'))
        print(self.statistic)

    def _write_stats(self, *args, **kwargs):
        print(json.dumps({"rejected": self.rejected, "statistics": self.statistic}))
        # with open('output/result.json', 'w') as f:
        #     f.write(json.dumps({"rejected": self.rejected, "statistics": self.statistic}, indent=4))
