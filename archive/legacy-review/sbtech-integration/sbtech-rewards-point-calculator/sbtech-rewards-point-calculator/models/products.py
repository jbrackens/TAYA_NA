from uuid import uuid4
from .model import Model
from options import OperatorRmxCodes


class Product(Model):
    @property
    def external_transaction_id(self):
        return self._external_transaction_id

    @external_transaction_id.setter
    def external_transaction_id(self, value):
        self._external_transaction_id = value if value != '' and value is not None else str(uuid4())

    def to_json(self):
        return {
            'price': self.amount,
            'for_user': self.external_user_id,
            'title': self.title,
            'transaction_id': self.external_transaction_id,
            'ignore_on_duplicate': True,
            'company_id': OperatorRmxCodes[self.company_id],
        }
