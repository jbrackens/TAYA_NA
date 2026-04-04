from storages.backends.sftpstorage import SFTPStorage
from storages.utils import setting


class SFTPStorageStaticFiles(SFTPStorage):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._base_url = setting('STATIC_URL')


