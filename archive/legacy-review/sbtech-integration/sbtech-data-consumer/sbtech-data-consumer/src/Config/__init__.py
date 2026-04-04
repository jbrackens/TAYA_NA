from .config import Config
from os import environ


config = eval(environ.get('APP_CONFIG_CLASS', 'Config'))
