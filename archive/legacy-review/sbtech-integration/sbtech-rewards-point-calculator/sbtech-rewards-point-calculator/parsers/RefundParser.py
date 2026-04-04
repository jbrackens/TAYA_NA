import arrow
from .Parser import Parser
from models import DirectBonus
from options import OperatorRmxCodes


class RefundParser(Parser):
    def __init__(self, *args, **kwargs):
        super(RefundParser, self).__init__(*args, **kwargs)
        self.date = arrow.get(self.date, 'YYYYMMDD').format('YYYY-MM-DD') + 'T23:59:59+00'

        self.transaction_id_template = 'refund-{transaction_id}'

    def __parse_item(self, data):
        customer_id = data.get('customer_id')
        transaction_id = self.transaction_id_template.format(transaction_id=data.get('transaction_id'))

        instance = DirectBonus()
        instance.external_user_id = customer_id
        instance.external_transaction_id = transaction_id
        instance.title = 'Refunded for Transaction: {} for user {}'.format(
            data.get('transaction_id'),
            data.get('customer_id')
        )
        instance.created_date = self.date
        instance.company_id = OperatorRmxCodes[data.get('operator')]
        instance.amount = data.get('points')
        instance.context_data = {
            'transaction_id': transaction_id,
            'refunded_at_datetime': self.date,
            'customer_id': customer_id,
            'operator': data.get('operator'),
            'points': data.get('points')
        }

        if instance.amount < 0.01:
            return None

        return instance

    def get_items(self):
        for row in self.rows:
            instance = self.__parse_item(row)
            if instance is not None:
                yield instance.to_json()
