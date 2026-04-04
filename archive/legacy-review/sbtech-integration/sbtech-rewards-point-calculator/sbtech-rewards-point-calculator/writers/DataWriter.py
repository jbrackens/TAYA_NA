class DataWriter:
    def __init__(self, *args, **kwargs):
        self.items = []

    def __enter__(self):
        pass

    def _process_stats(self, *args, **kwargs):
        pass

    def _write_stats(self, *args, **kwargs):
        pass

    def add(self, item, *args, **kwargs):
        if item is not None:
            self.items.append(item)

    def save(self, *args, **kwargs):
        pass

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass
