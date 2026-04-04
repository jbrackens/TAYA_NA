from .Parser import Parser
from models import Product


class BuyProductParser(Parser):
    def __init__(self, *args, **kwargs):
        super(BuyProductParser, self).__init__(*args, **kwargs)

    def __parse_item(self, data):
        instance = Product()
        instance.external_user_id = data.get('customer_id')
        instance.external_transaction_id = data.get('transaction_id')
        instance.title = data.get('transaction_title')
        instance.amount = data.get('amount')
        instance.company_id = data.get('operator')

        return instance

    def get_items(self):
        for row in self.rows:
            instance = self.__parse_item(row)
            if instance is not None:
                yield instance.to_json()
