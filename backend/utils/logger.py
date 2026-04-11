"""
Logging utility for the ShopBot backend.

Provides a standardized logger configuration for consistent output across
the application.
"""

import logging
import sys


def get_logger(name: str) -> logging.Logger:
    """Return a configured logger instance with the specified name.

    Args:
        name: The name for the logger, typically __name__.

    Returns:
        A logging.Logger instance configured to write to stdout.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger
