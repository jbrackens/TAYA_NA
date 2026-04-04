from .model import Model


class DirectBonus(Model):
    def __init__(self, *args, **kwargs):
        super(DirectBonus, self).__init__(args, kwargs)

        self._external_transaction_id = None
        self._amount = None
        self._title = None
        self._created_date = None
        self._context_data = {}
        self._operation_subtype = 'BPG'

    @property
    def amount(self):
        return self._amount

    @amount.setter
    def amount(self, value):
        self._amount = value

    @property
    def external_transaction_id(self):
        return self._external_transaction_id

    @external_transaction_id.setter
    def external_transaction_id(self, value):
        self._external_transaction_id = value

    @property
    def title(self):
        return self._title

    @title.setter
    def title(self, value):
        self._title = value

    @property
    def created_date(self):
        return self._created_date

    @created_date.setter
    def created_date(self, value):
        self._created_date = value

    @property
    def context_data(self):
        return self._context_data

    @context_data.setter
    def context_data(self, value):
        self._context_data = value

    @property
    def operation_subtype(self):
        return self._operation_subtype

    @operation_subtype.setter
    def operation_subtype(self, value):
        self._operation_subtype = value

    def to_json(self):
        return {
            'external_user_id': self.external_user_id,
            'external_transaction_id': self.external_transaction_id,
            'amount': self.amount,
            'title': self.title,
            'created_date': self.created_date,
            'company_id': self.company_id,
            'operation_subtype': self._operation_subtype,
            'context_data': {}
        }
