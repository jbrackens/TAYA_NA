import logging

from logstash_formatter import LogstashFormatterV1

logger = logging.getLogger(__name__)


class LogstashFormatterWithoutProcess(LogstashFormatterV1):
    def format(self, record):
        record.processName = "{}_{}".format(record.processName, record.process)
        del record.process
        return super().format(record)


class SimplyConsoleFormatter(logging.Formatter):
    def format(self, record):
        record.processName = "{}_{}".format(record.processName, record.process)
        del record.process
        return super().format(record)
