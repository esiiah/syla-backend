# app/ai/cache.py
import json
import os
import time
from typing import Optional, Dict, Any
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class AICache:
    def __init__(self):
        self.cache_enabled = os.getenv("AI_CACHE_ENABLED", "true").lower() == "true"
        self.redis_url = os.getenv("REDIS_URL")
        
        if self.cache_enabled and self.redis_url:
            try:
                import redis
                self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
                self.redis_client.ping()  # Test connection
                self.cache_type = "redis"
                logger.info("Using Redis for AI caching")
            except Exception as e:
                logger.warning(f"Redis connection failed, falling back to memory cache: {e}")
                self.cache_type = "memory"
                self._memory_cache = {}
        else:
            self.cache_type = "memory"
            self._memory_cache = {}
            logger.info("Using in-memory cache for AI")
    
    def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Get cached forecast result"""
        if not self.cache_enabled:
            return None
        
        try:
            if self.cache_type == "redis":
                cached = self.redis_client.get(f"ai_forecast:{key}")
                if cached:
                    return json.loads(cached)
            else:
                # Memory cache with TTL check
                if key in self._memory_cache:
                    item = self._memory_cache[key]
                    if item["expires_at"] > time.time():
                        return item["data"]
                    else:
                        del self._memory_cache[key]
            
            return None
            
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    def set(self, key: str, data: Dict[str, Any], ttl_minutes: int = 30) -> bool:
        """Cache forecast result with TTL"""
        if not self.cache_enabled:
            return False
        
        try:
            if self.cache_type == "redis":
                serialized = json.dumps(data, default=str)
                self.redis_client.setex(
                    f"ai_forecast:{key}",
                    ttl_minutes * 60,
                    serialized
                )
            else:
                # Memory cache with expiration
                self._memory_cache[key] = {
                    "data": data,
                    "expires_at": time.time() + (ttl_minutes * 60)
                }
                # Clean up expired entries periodically
                self._cleanup_memory_cache()
            
            return True
            
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    def clear_user_cache(self, user_id: str) -> int:
        """Clear cached forecasts for a specific user"""
        if not self.cache_enabled:
            return 0
        
        try:
            cleared_count = 0
            
            if self.cache_type == "redis":
                # Find keys containing user_id and delete them
                pattern = f"ai_forecast:*{user_id}*"
                keys = self.redis_client.keys(pattern)
                if keys:
                    self.redis_client.delete(*keys)
                    cleared_count = len(keys)
            else:
                # Memory cache - remove entries that might belong to user
                keys_to_remove = []
                for key in self._memory_cache.keys():
                    if user_id in key:
                        keys_to_remove.append(key)
                
                for key in keys_to_remove:
                    del self._memory_cache[key]
                    cleared_count += 1
            
            logger.info(f"Cleared {cleared_count} cache entries for user {user_id}")
            return cleared_count
            
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
            return 0
    
    def _cleanup_memory_cache(self):
        """Remove expired entries from memory cache"""
        if self.cache_type != "memory":
            return
        
        current_time = time.time()
        expired_keys = [
            key for key, item in self._memory_cache.items()
            if item["expires_at"] <= current_time
        ]
        
        for key in expired_keys:
            del self._memory_cache[key]
        
        if expired_keys:
            logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.cache_enabled:
            return {"enabled": False}
        
        try:
            if self.cache_type == "redis":
                info = self.redis_client.info()
                return {
                    "enabled": True,
                    "type": "redis",
                    "connected_clients": info.get("connected_clients", 0),
                    "used_memory_human": info.get("used_memory_human", "unknown"),
                    "keys": len(self.redis_client.keys("ai_forecast:*"))
                }
            else:
                # Clean up expired first
                self._cleanup_memory_cache()
                return {
                    "enabled": True,
                    "type": "memory",
                    "keys": len(self._memory_cache),
                    "memory_usage": f"{len(str(self._memory_cache))} bytes (approx)"
                }
                
        except Exception as e:
            logger.error(f"Cache stats error: {e}")
            return {"enabled": True, "type": self.cache_type, "error": str(e)}
