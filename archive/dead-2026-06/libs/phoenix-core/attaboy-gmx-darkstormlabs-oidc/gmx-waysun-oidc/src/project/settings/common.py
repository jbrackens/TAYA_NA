import logging
import os
import sys

logger = logging.getLogger(__name__)


BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if len(sys.argv) > 1 and sys.argv[1] == "test":
    logger.warning("! ! !      TESTS_IN_PROGRESS DETECTED     ! ! !")
    TESTS_IN_PROGRESS = True
else:
    TESTS_IN_PROGRESS = False

if len(sys.argv) > 1 and sys.argv[0] == "manage.py" and sys.argv[1] == "migrate":
    logger.warning("! ! !      MIGRATIONS_IN_PROGRESS DETECTED     ! ! !")
    MIGRATIONS_IN_PROGRESS = True
else:
    MIGRATIONS_IN_PROGRESS = False
