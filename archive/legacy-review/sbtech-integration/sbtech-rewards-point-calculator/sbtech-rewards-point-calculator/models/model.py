class Model:
    def __init__(self, *args, **kwargs):
        self._external_user_id = None
        self._company_id = None

    @property
    def external_user_id(self):
        return self._external_user_id

    @external_user_id.setter
    def external_user_id(self, value):
        self._external_user_id = value

    @property
    def company_id(self):
        return self._company_id

    @company_id.setter
    def company_id(self, value):
        self._company_id = value

    def to_json(self):
        return {
            'external_user_id': self._external_user_id,
            'company_id': self._company_id
        }
