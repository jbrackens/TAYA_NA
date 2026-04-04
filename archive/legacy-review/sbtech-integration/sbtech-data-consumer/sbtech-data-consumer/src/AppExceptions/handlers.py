import signal
import sys


class SignalHandler(object):
    def __init__(self, *args, **kwargs):
        self.context = kwargs.get('context')

        signal.signal(signal.SIGINT, self.receive)

    def receive(self, sig, frame):
        map(lambda x: x.stop(), self.context.get('threads').iter())
        sys.exit(0)
