from .Parser import Parser
from models import Punter
from options import OperatorRmxCodes


class PuntersChameleonParser(Parser):
    ENCODING = 'utf-8'

    def __parse_item(self, row):
        instance = Punter()
        instance.external_user_id = row.get('Customer ID', None)
        instance.company_id = OperatorRmxCodes[row.get('Operator', None)]
        instance.email = row.get('Email', None)

        if instance.company_id is None:
            return None

        return instance

    def get_items(self):
        for row in self.rows:
            instance = self.__parse_item(row)
            if instance is not None:
                yield instance.to_json()
