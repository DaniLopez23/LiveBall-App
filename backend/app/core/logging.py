import os
from copy import deepcopy
from logging.config import dictConfig


DEFAULT_LOG_LEVEL = "INFO"


def get_log_level() -> str:
    """Returns the configured application log level."""
    return os.getenv("LOG_LEVEL", DEFAULT_LOG_LEVEL).upper()

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "[%(asctime)s] [%(levelname)s] %(name)s: %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
        },
    },
    "root": {
        "level": DEFAULT_LOG_LEVEL,
        "handlers": ["console"],
    },
}


def setup_logging():
    config = deepcopy(LOGGING_CONFIG)
    config["root"]["level"] = get_log_level()
    dictConfig(config)
