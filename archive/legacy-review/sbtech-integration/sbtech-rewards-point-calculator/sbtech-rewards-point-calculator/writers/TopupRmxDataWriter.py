from .RmxDataWriter import RmxDataWriter


class TopupRmxDataWriter(RmxDataWriter):
    ENDPOINT = 'topup'
    BUFFER_SIZE = 25
    EXPECTED_RESPONSE_STATUS_CODE = 201

    def __enter__(self):
        super(TopupRmxDataWriter, self).__enter__()
        self.statistic = {'successes': 0, 'errors': 0}

        return self

    def _process_stats(self, *args, **kwargs):
        response = kwargs.get('response')

        self.statistic['successes'] += len(response.get('successes'))
        self.statistic['errors'] += len(response.get('errors'))
        print(self.statistic)

    def _write_stats(self, *args, **kwargs):
        pass
