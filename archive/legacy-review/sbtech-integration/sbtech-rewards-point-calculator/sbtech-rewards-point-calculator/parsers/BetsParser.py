import arrow
from .Parser import Parser
from models.bets import SingleBet, DoubleBet, TrebleBet, FourFoldBet, MultiFoldBet, SystemBet
from options import OperatorRmxCodes


class BetsParser(Parser):
    def __parse_item(self, data):
        bet_type = data.get('Bet Type')
        is_free_bet = data.get('Is Free Bet')

        if is_free_bet == 'Yes':
            return None
        elif bet_type == 'Single':
            __class = SingleBet
        elif bet_type[:4] == 'Sys:':
            __class = SystemBet
        elif bet_type == 'Com: Doubles':
            __class = DoubleBet
        elif bet_type == 'Com: Trebles':
            __class = TrebleBet
        elif bet_type == 'Com: 4 folds':
            __class = FourFoldBet
        elif bet_type[:4] == 'Com:':
            __class = MultiFoldBet
        else:
            return None

        instance = __class()
        instance.external_user_id = data.get('Customer-ID')
        instance.external_transaction_id = data.get('Bet ID')
        instance.title = 'Bet Settlement Reward'
        instance.created_date = arrow.get(data.get('Bet Date & Time')).format('YYYY-MM-DDTHH:mm:ssZ')
        instance.company_id = OperatorRmxCodes[data.get('Operator')]
        instance.amount = data.get('Stake Customer Currency') * (data.get("Real Money %") / 100.00)
        instance.context_data = {
            'bet_id': data.get('Bet ID'),
            'purchase_id': data.get('Purchase ID'),
            'bet_type': data.get('Bet Type'),
            'bet_datetime': arrow.get(data.get('Bet Date & Time')).format('YYYY-MM-DDTHH:mm:ssZ'),
            'customer_id': data.get('Customer-ID'),
            'username': data.get('Username'),
            'full_name': data.get('Full Name'),
            'event_datetime': arrow.get(data.get('Event Date')).format('YYYY-MM-DDTHH:mm:ssZ'),
            'league': data.get('League'),
            'sport': data.get('Sport'),
            'event': data.get('Event'),
            'selection': data.get('Selection'),
            'operator': data.get('Operator'),
            'brand': data.get('Brand'),
            'client_type': data.get('Client Type'),
            'bet_status': data.get('Bet Status'),
            'score': data.get('Score'),
            'stake_selected_currency': data.get('Stake Selected Currency'),
            'stake_customer_currency': data.get('Stake Customer Currency'),
            'return_selected_currency': data.get('Return Selected Currency'),
            'return_customer_currency': data.get('Return Customer Currency'),
            'win_loss_selected_currency': data.get('Win/Loss Selected Currency'),
            'win_loss_customer_currency': data.get('Win/Loss Customer Currency'),
            'real_money_percent': data.get("Real Money %"),
            'bet_settled_datetime': arrow.get(data.get('Bet Settled Date & Time')).format('YYYY-MM-DDTHH:mm:ssZ'),
            'portfolio_player': data.get('Portfolio Player'),
            'is_active': data.get('isActive')
        }

        if instance.amount <= 0.01 or instance.company_id is None:
            return None

        return instance

    def get_items(self):
        for row in self.rows:
            instance = self.__parse_item(row)
            if instance is not None:
                yield instance.to_json()
