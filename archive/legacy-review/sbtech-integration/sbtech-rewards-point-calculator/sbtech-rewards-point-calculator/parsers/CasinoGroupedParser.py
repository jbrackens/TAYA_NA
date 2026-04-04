import arrow
from .Parser import Parser
from models.bets import CasinoBet
from options import OperatorRmxCodes


class CasinoGroupedParser(Parser):
    def __init__(self, *args, **kwargs):
        super(CasinoGroupedParser, self).__init__(*args, **kwargs)
        self.ext_transaction_date = self.key.split('-')[-1].split('.')[0]
        self.date = arrow.get(self.ext_transaction_date, 'YYYYMMDD[T]HHmmss').format('YYYY-MM-DDTHH:mm:ss+00')

    def __parse_item(self, data):
        instance = CasinoBet()
        instance.external_user_id = data.get('Customer ID')
        instance.external_transaction_id = '{}-casino-{}'.format(data.get('Customer ID'), self.ext_transaction_date)
        instance.title = 'Casino Spin Reward'
        instance.created_date = self.date
        instance.company_id = OperatorRmxCodes[data.get('Operator')]
        instance.amount = data.get('Turnover')
        instance.context_data = {
            'username': data.get('Group'),
            'customer_id': data.get('Customer ID'),
            'company_id': OperatorRmxCodes[data.get('Operator')],
            'total_deposits_to_casino': data.get('Total Deposits To Casino'),
            'total_deposits': data.get('Total Deposits'),
            'number_of_bets': data.get('# of Bets'),
            'turnover': data.get('Turnover'),
            'avg_bet_amount': data.get('Avg. Bet Amount'),
            'ggr': data.get('GGR'),
            'arpu': data.get('ARPU'),
            'margin': data.get('Margin (%)'),
            'ngr': data.get('NGR'),
            'bonus_spent': data.get('Bonus Spent'),
            'portfolio_customer': data.get('Portfolio Customer'),
            'is_active': data.get('isActive'),
            'created_date': self.date,
            'transaction_id': '{}-casino-{}'.format(data.get('Customer ID'), self.date)
        }

        if instance.amount < 0.01 or instance.company_id is None:
            return None

        return instance

    def get_items(self):
        for row in self.rows:
            instance = self.__parse_item(row)
            if instance is not None:
                yield instance.to_json()
