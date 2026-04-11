"""
Memory management for the ShopBot AI agent.

Provides a bounded in-memory checkpointer to persist conversation state
while preventing unbounded memory growth.
"""

import threading
import time
from typing import Dict

from langgraph.checkpoint.memory import MemorySaver

# Default thresholds for memory eviction
MAX_SESSIONS = 500
SESSION_TTL_SECONDS = 3600  # 1 hour


class BoundedMemorySaver(MemorySaver):
    """MemorySaver wrapper that evicts stale sessions to bound memory usage.

    Tracks the last-access time of each thread_id and periodically prunes
    sessions that exceed the TTL or when the total count exceeds threshold.
    """

    def __init__(self, max_sessions: int = MAX_SESSIONS, ttl_seconds: int = SESSION_TTL_SECONDS) -> None:
        """Initialize the bounded memory saver.

        Args:
            max_sessions: Maximum number of concurrent sessions to keep.
            ttl_seconds: Seconds of inactivity before a session is considered stale.
        """
        super().__init__()
        self._max_sessions = max_sessions
        self._ttl_seconds = ttl_seconds
        self._access_times: Dict[str, float] = {}
        self._lock = threading.Lock()

    def _touch(self, thread_id: str) -> None:
        """Record the current time as the last access for a thread.

        Args:
            thread_id: The session identifier to update.
        """
        with self._lock:
            self._access_times[thread_id] = time.time()

    def _evict_stale(self) -> None:
        """Remove sessions older than TTL or exceeding the max count."""
        now = time.time()
        with self._lock:
            # 1. Evict by TTL
            expired = [
                tid for tid, ts in self._access_times.items()
                if now - ts > self._ttl_seconds
            ]
            for tid in expired:
                self.storage.pop(tid, None)
                self._access_times.pop(tid, None)

            # 2. Evict by count (remove oldest first)
            if len(self._access_times) > self._max_sessions:
                sorted_sessions = sorted(self._access_times.items(), key=lambda x: x[1])
                excess = len(self._access_times) - self._max_sessions
                for tid, _ in sorted_sessions[:excess]:
                    self.storage.pop(tid, None)
                    self._access_times.pop(tid, None)

    def put(self, config: dict, checkpoint: dict, metadata: dict, new_versions: dict) -> dict:
        """Override put to track access times and trigger eviction.

        Args:
            config: LangGraph configuration containing thread_id.
            checkpoint: The state snapshot to save.
            metadata: Metadata associated with the checkpoint.
            new_versions: Version tracking data.

        Returns:
            The saved checkpoint data.
        """
        thread_id = config.get("configurable", {}).get("thread_id", "")
        if thread_id:
            self._touch(thread_id)
            self._evict_stale()
        return super().put(config, checkpoint, metadata, new_versions)
