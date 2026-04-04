from .model import Model
from decimal import Decimal


def get_bet_object_from_data(*args, **kwargs):
    bet_type = kwargs.get('data').get('Bet Type')
    is_free_bet = kwargs.get('data').get('Is Free Bet')

    if is_free_bet == 'Yes':
        result = None
    elif bet_type == 'Casino':
        result = CasinoBet(**kwargs).to_json()
    elif bet_type == 'Single':
        result = SingleBet(**kwargs).to_json()
    elif bet_type[:4] == 'Sys:':
        result = SystemBet(**kwargs).to_json()
    elif bet_type == 'Com: Doubles':
        result = DoubleBet(**kwargs).to_json()
    elif bet_type == 'Com: Trebles':
        result = TrebleBet(**kwargs).to_json()
    elif bet_type == 'Com: 4 folds':
        result = FourFoldBet(**kwargs).to_json()
    elif bet_type[:4] == 'Com:':
        result = MultiFoldBet(**kwargs).to_json()
    else:
        result = None

    return result


class Bet(Model):
    BONUS_MULTIPLIER = Decimal(1.0)
    multiplier = Decimal(1.0)
    QUANTIZE = Decimal('0.0000000001')

    def __init__(self, *args, **kwargs):
        super(Bet, self).__init__(args, kwargs)

        self._external_transaction_id = None
        self._amount = None
        self._title = None
        self._created_date = None
        self._context_data = {}
        self._operation_subtype = 'STD'

    def __calculate(self, value):
        return round(float(
            (Decimal(value) * self.multiplier * Decimal(1000.0) * self.BONUS_MULTIPLIER).quantize(self.QUANTIZE)
        ), 8)

    @property
    def amount(self):
        return self._amount

    @amount.setter
    def amount(self, value):
        self._amount = self.__calculate(value)
        pass

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
            'context_data': self.context_data
        }


class CasinoBet(Bet):
    multiplier = Decimal(0.0025)


class SportBet(Bet):
    pass


class SingleBet(SportBet):
    multiplier = Decimal(0.0025)


class DoubleBet(SportBet):
    multiplier = Decimal(0.0125)


class TrebleBet(SportBet):
    multiplier = Decimal(0.0175)


class FourFoldBet(SportBet):
    multiplier = Decimal(0.025)


class MultiFoldBet(SportBet):
    multiplier = Decimal(0.035)


class SystemBet(SportBet):
    multiplier = Decimal(0.015)
