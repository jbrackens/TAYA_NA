import arrow
from .Parser import Parser
from models.bets import SingleBet, DoubleBet, TrebleBet, FourFoldBet, MultiFoldBet, SystemBet, CasinoBet
from options import OperatorRmxCodes


class OlapParser(Parser):
    def __init__(self, *args, **kwargs):
        super(OlapParser, self).__init__(*args, **kwargs)
        self.date = arrow.get(self.date, 'YYYYMMDD').format('YYYY-MM-DD') + 'T23:59:59+00'

        self.bet_id_template = 'bonus-{campaign_name}-{{customer_id}}-{{transaction_type}}-{date}'.format(
            campaign_name=self.key.split('-')[-2], date=self.date
        )

        self.type_mapping = {
            'single': {'class': SingleBet, 'bet_type': 'Single', 'title': 'Single Bets Settlement Reward'},
            'double': {'class': DoubleBet, 'bet_type': 'Com: Doubles', 'title': 'Double Bets Settlement Reward'},
            'treble': {'class': TrebleBet, 'bet_type': 'Com: Trebles', 'title': 'Treble Bets Settlement Reward'},
            'four-fold': {'class': FourFoldBet, 'bet_type': 'Com: 4 folds', 'title': '4 Fold Bets Settlement Reward'},
            'five-fold': {'class': MultiFoldBet, 'bet_type': 'Com: 5+ folds', 'title': '5+ Fold Bets Settlement Reward'},
            'system': {'class': SystemBet, 'bet_type': 'Sys: System Bet', 'title': 'System Bets Settlement Reward'},
            'casino': {'class': CasinoBet, 'bet_type': 'Casino', 'title': 'Casino Reward'}
        }

    def __split_row(self, row):
        def __gen(customer_id, operator, col_name, row_value):
            return {
                'customer_id': customer_id,
                'bet_id': self.bet_id_template.format(
                    customer_id=customer_id,
                    transaction_type=col_name
                ),
                'bet_type': self.type_mapping.get(col_name).get('bet_type'),
                'title': self.type_mapping.get(col_name).get('title'),
                'date': self.date,
                'operator': operator,
                'turnover': row_value,
                'class': self.type_mapping.get(col_name).get('class')
            }

        customer_id = row['customer_id']
        operator = row['operator']
        result = [
            __gen(customer_id, operator, key, value)
            for key, value in row.items()
            if key != 'customer_id' and value != '' and key != 'operator'
        ]

        return result

    def __parse_item(self, data):
        instance = data.get('class')()
        instance.external_user_id = data.get('customer_id')
        instance.external_transaction_id = data.get('bet_id')
        instance.title = data.get('title')
        instance.created_date = data.get('date')
        instance.company_id = OperatorRmxCodes[data.get('operator')]
        instance.amount = data.get('turnover')
        instance.context_data = {
            'bet_id': data.get('bet_id'),
            'bet_type': data.get('bet_type'),
            'bet_datetime': data.get('date'),
            'customer_id': data.get('customer_id'),
            'operator': data.get('operator'),
            'stake_customer_currency': data.get('turnover')
        }

        if instance.amount < 0.01:
            return None

        return instance

    def get_items(self):
        for row in self.rows:
            split_rows = self.__split_row(row)
            for split_row in split_rows:
                instance = self.__parse_item(split_row)
                if instance is not None:
                    yield instance.to_json()
