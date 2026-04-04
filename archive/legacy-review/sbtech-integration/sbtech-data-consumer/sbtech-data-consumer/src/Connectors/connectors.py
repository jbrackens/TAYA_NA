from pykafka import SslConfig, KafkaClient
from pykafka.connection import BrokerConnection

from src.Config import config


def _broker_connection_init_via_jump_box(
    self, host, port, handler, buffer_size=1024 * 1024, source_host='', source_port=0, ssl_config=None
):
    self._buff = bytearray(buffer_size)
    self.host = host
    self.port = port
    self._handler = handler
    self._socket = None
    self.source_host = source_host
    self.source_port = source_port
    self._wrap_socket = (ssl_config.wrap_socket if ssl_config else lambda x: x)


class SslPyKafka:
    def __init__(self):
        if config.CONNECTING_VIA_JUMP_BOX is True:
            BrokerConnection.__init__ = _broker_connection_init_via_jump_box

        self.__ssl_config = SslConfig(
            cafile=config.SSL_CA_FILE_PATH,
            certfile=config.SSL_CERT_FILE_PATH,
            keyfile=config.SSL_KEY_FILE_PATH,
            password=config.SSL_PASSWORD.encode()
        )

        self.__client = KafkaClient(hosts=config.KAFKA_URL, ssl_config=self.__ssl_config)

    def get_client(self):
        return self.__client
