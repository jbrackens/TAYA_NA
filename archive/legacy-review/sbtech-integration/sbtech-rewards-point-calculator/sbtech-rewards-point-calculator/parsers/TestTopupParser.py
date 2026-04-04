import arrow
import uuid

from .Parser import Parser
from models import DirectBonus
from options import OperatorRmxCodes


class TestTopupParser(Parser):
    def __init__(self, *args, **kwargs):
        self.rows = [{}]
        self.date = arrow.now().format('YYYY-MM-DD') + 'T23:59:59+00'

    def __parse_item(self, data):
        customer_id = '11293636'
        operator = 'Sportnation'
        transaction_id = 'test-inc-{}'.format(str(uuid.uuid4()))

        instance = DirectBonus()
        instance.external_user_id = customer_id
        instance.external_transaction_id = transaction_id
        instance.title = 'Test Topup Transaction: {} for user {}'.format(transaction_id, customer_id)
        instance.created_date = self.date
        instance.company_id = OperatorRmxCodes[operator]
        instance.amount = 10000
        instance.context_data = {
            'transaction_id': transaction_id,
            'refunded_at_datetime': self.date,
            'customer_id': customer_id,
            'operator': operator,
            'points': 10000
        }

        if instance.amount < 0.01:
            return None

        return instance

    def get_items(self):
        for row in self.rows:
            instance = self.__parse_item(row)
            if instance is not None:
                yield instance.to_json()
