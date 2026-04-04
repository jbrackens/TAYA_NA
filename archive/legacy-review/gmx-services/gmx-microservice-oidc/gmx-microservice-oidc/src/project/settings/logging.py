import logging.config
import logging
import json
from decouple import config

DJANGO_MICROSERVICE_NAME = config('DJANGO_MICROSERVICE_NAME', default='gmx-base-microservice')
DJANGO_ENVIRONMENT_TYPE = config('DJANGO_ENVIRONMENT_TYPE', default='local')
DJANGO_LOG_HANDLER = config('DJANGO_LOG_HANDLER', default='console')

LOGGING_CONFIG = None

logging.config.dictConfig({
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'console': {
            '()': 'django.utils.log.ServerFormatter',
            'format': '[{server_time}] [{name}:{lineno}] {message}',
            'style': '{',
        },
        'logstash': {
            '()': 'aws_rest_default.logger.LogstashFormatterWithoutProcess',
            'fmt': json.dumps({
                'source_host': '{}'.format(DJANGO_MICROSERVICE_NAME),
                'extra': {
                        'environment': '{}'.format(DJANGO_ENVIRONMENT_TYPE),
                        'microservice': '{}'.format(DJANGO_MICROSERVICE_NAME)
                }
            })
        }
    },
    'handlers': {
        'logstash': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'logstash',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'logstash',
        }
    },
    'loggers': {
        'django': {
            'handlers': [DJANGO_LOG_HANDLER],
            'level': 'INFO',
            'propagate': False,
        },
        'django.server': {
            'handlers': [DJANGO_LOG_HANDLER],
            'level': 'INFO',
            'propagate': False,
        },
        'aws_rest_default': {
            'handlers': [DJANGO_LOG_HANDLER],
            'level': 'INFO',
            'propagate': False,
        },
        '': {
            'handlers': [DJANGO_LOG_HANDLER],
            'level': 'INFO',
            'propagate': False,
        },
    }
})
