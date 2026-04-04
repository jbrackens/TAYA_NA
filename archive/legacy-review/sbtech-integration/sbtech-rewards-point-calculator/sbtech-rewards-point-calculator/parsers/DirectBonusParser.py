import arrow
from .Parser import Parser
from models import DirectBonus
from options import OperatorRmxCodes


class DirectBonusParser(Parser):
    def __init__(self, *args, **kwargs):
        super(DirectBonusParser, self).__init__(*args, **kwargs)
        self.date = arrow.get(self.date, 'YYYYMMDD').format('YYYY-MM-DD') + 'T23:59:59+00'
        self.campaign_name = self.key.split('-')[-2]

        self.bet_id_template = 'bonus-{campaign_name}-{{customer_id}}-direct-{date}'.format(
            campaign_name=self.campaign_name, date=self.date
        )

    def __parse_item(self, data):
        customer_id = data.get('customer_id')
        bet_id = self.bet_id_template.format(customer_id=customer_id)

        instance = DirectBonus()
        instance.external_user_id = customer_id
        instance.external_transaction_id = bet_id
        instance.title = 'Direct Bonus for Campaign: {} on {}'.format(
            self.campaign_name,
            arrow.get(self.date, 'YYYY-MM-DDTHH:mm:ssZ').format('YYYY-MM-DD')
        )
        instance.created_date = self.date
        instance.company_id = OperatorRmxCodes[data.get('operator')]
        instance.amount = data.get('points')
        instance.operation_subtype = data.get('operation_subtype', 'BPG')

        if instance.amount < 0.01:
            return None

        return instance

    def get_items(self):
        for row in self.rows:
            instance = self.__parse_item(row)
            if instance is not None:
                yield instance.to_json()
