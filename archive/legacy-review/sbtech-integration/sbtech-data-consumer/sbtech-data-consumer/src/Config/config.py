from os import environ
import logging


class Config:
    SSL_CA_FILE_PATH = environ.get('SSL_CA_FILE_PATH')
    SSL_CERT_FILE_PATH = environ.get('SSL_CERT_FILE_PATH')
    SSL_KEY_FILE_PATH = environ.get('SSL_KEY_FILE_PATH')
    SSL_PASSWORD = environ.get('SSL_PASSWORD')

    KAFKA_HOST = environ.get('KAFKA_HOST')
    KAFKA_PORT = environ.get('KAFKA_PORT')
    KAFKA_URL = '{}:{}'.format(environ.get('KAFKA_HOST'), environ.get('KAFKA_PORT'))

    CONNECTING_VIA_JUMP_BOX = environ.get('CONNECTING_VIA_JUMP_BOX') == 'True'
    GROUP_ID = environ.get('GROUP_ID').encode()
    DEBUG = environ.get('DEBUG', False)
    MONGODB_URI = environ.get('MONGODB_URI')

    def __init__(self):

        logging.basicConfig(
            level=logging.DEBUG,
            format='%(asctime)s %(name)-12s %(levelname)-8s %(message)s',
            datefmt='%m-%d %H:%M',
        )

        console = logging.StreamHandler()
        formatter = logging.Formatter('%(name)-12s: %(levelname)-8s %(message)s')
        console.setLevel(logging.DEBUG)
        console.setFormatter(formatter)
        logging.getLogger('').addHandler(console)
