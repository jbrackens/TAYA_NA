from src.Connectors import SslPyKafka
from src.Config import config
from src.AppExceptions import AppExceptionNotImplemented
from src.SchemaManagers import avro_schema_manager

from io import BytesIO

from threading import Thread

import avro.schema
import avro.io
import json


class KafkaMessageConsumer(Thread):
    TOPIC_NAME = ''

    def __init__(self, *args, **kwargs):
        super(KafkaMessageConsumer, self).__init__()

        sbtech_kafka = SslPyKafka()

        self._topic_title = '{}_{}'.format(self.TOPIC_NAME, kwargs.get('brand_id')).encode()
        self._schema = avro_schema_manager.get_by_type(self.TOPIC_NAME)
        self._topic = sbtech_kafka.get_client().topics[self._topic_title]
        self._consumer = self._topic.get_simple_consumer(consumer_group=config.GROUP_ID)

    def run(self, *args, **kwargs):
        while True:
            for message in self._consumer:
                if message is not None:
                    parsed_message = self.parse(message=message.value)
                    self.on_message(message=parsed_message)

    def parse(self, *args, **kwargs):
        return kwargs.get('message')

    def on_message(self, *args, **kwargs):
        raise AppExceptionNotImplemented()


class AvroMessageConsumer(KafkaMessageConsumer):
    def parse(self, *args, **kwargs):
        b = BytesIO(kwargs.get('message'))
        decoder = avro.io.BinaryDecoder(b)
        reader = avro.io.DatumReader(self._schema)

        return reader.read(decoder)


class LoginMessageConsumer(AvroMessageConsumer):
    TOPIC_NAME = 'login'

    def on_message(self, *args, **kwargs):
        pass
        print(kwargs.get('message'))


class CustomerDetailsMessageConsumer(AvroMessageConsumer):
    TOPIC_NAME = 'customerdetails'

    def on_message(self, *args, **kwargs):
        pass
        print(kwargs.get('message'))


class WalletTransactionMessageConsumer(AvroMessageConsumer):
    TOPIC_NAME = 'wallettransaction'

    def on_message(self, *args, **kwargs):
        pass
        print(kwargs.get('message'))


class CasinoBetMessageConsumer(AvroMessageConsumer):
    TOPIC_NAME = 'casinobets'

    def on_message(self, *args, **kwargs):
        pass
        print(kwargs.get('message'))


class SportBetMessageConsumer(KafkaMessageConsumer):
    TOPIC_NAME = 'sportbetsinfo'

    def on_message(self, *args, **kwargs):
        message = kwargs.get('message').decode("utf-8")
        print(message)
        message = json.loads(message)
        pass
