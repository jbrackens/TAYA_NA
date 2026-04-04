from pymongo import MongoClient
from src.Config import config


class Storage:
    def __init__(self, *args, **kwargs):
        self.config = kwargs.get('config')

    def update(self, *args, **kwargs):
        pass

    def save(self, *args, **kwargs):
        pass

    def delete(self, *args, **kwargs):
        pass


class Postgres(Storage):
    pass


class MongoDB(Storage):
    def __init__(self, *args, **kwargs):
        super(MongoDB, self).__init__(*args, **kwargs)

        self.client = MongoClient(config.MONGODB_URI)
        self.db = self.client['sport_nation']

    def update(self, *args, **kwargs):
        pass

    def save(self, *args, **kwargs):
        pass

    def delete(self, *args, **kwargs):
        pass
