from .model import Model


class Punter(Model):
    def __init__(self, *args, **kwargs):
        super(Punter, self).__init__(args, kwargs)
        self._email = None

    @staticmethod
    def __clean_email(email):
        return email[4:] if email.startswith('_se_') else email

    @property
    def email(self):
        return self._email

    @email.setter
    def email(self, value):
        self._email = self.__clean_email(value)

    def to_json(self):
        return {
            'external_user_id': self._external_user_id,
            'company_id': self._company_id,
            'email': self._email
        }
