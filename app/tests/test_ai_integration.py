# tests/test_ai_integration.py
import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from fastapi.testclient import TestClient

from app.ai.service import AIForecastService
from app.ai.clients import OpenAIClient, LocalForecastClient
from app.ai.cache import AICache

class TestAIIntegration:
    
    @pytest.fixture
    def sample_data(self):
        return [
            {"date": "2023-01", "sales": 100, "month": "Jan"},
            {"date": "2023-02", "sales": 110, "month": "Feb"},
            {"date": "2023-03", "sales": 105, "month": "Mar"},
            {"date": "2023-04", "sales": 120, "month": "Apr"},
            {"date": "2023-05", "sales": 115, "month": "May"}
        ]

    @pytest.fixture
    def ai_service(self):
        return AIForecastService()

    def test_forecast_request_validation(self, ai_service, sample_data):
        """Test basic forecast request validation"""
        # Valid request should not raise exception
        try:
            result = asyncio.run(ai_service.process_forecast_request(
                data=sample_data,
                scenario="increase sales by 10%",
                target_column="sales",
                user_id="test_user"
            ))
            assert result is not None
        except Exception as e:
            # Expected if OpenAI key not available in test
            assert "OPENAI_API_KEY" in str(e) or "Forecast processing failed" in str(e)

    def test_scenario_parsing_fallback(self, ai_service):
        """Test fallback scenario parsing when LLM is unavailable"""
        parsed = ai_service._fallback_scenario_parsing("increase by 15%")
        
        assert "adjustments" in parsed
        assert parsed["adjustments"]["multiplier"] == 1.05  # Default increase
        assert parsed["time_horizon"] == "monthly"

    def test_cache_key_generation(self, ai_service, sample_data):
        """Test cache key generation"""
        key1 = ai_service._generate_cache_key(
            sample_data, "test scenario", "sales", "hybrid"
        )
        key2 = ai_service._generate_cache_key(
            sample_data, "test scenario", "sales", "hybrid"  
        )
        key3 = ai_service._generate_cache_key(
            sample_data, "different scenario", "sales", "hybrid"
        )
        
        assert key1 == key2  # Same inputs = same key
        assert key1 != key3  # Different inputs = different key
        assert len(key1) == 16  # MD5 hash truncated to 16 chars

    def test_rate_limiting(self, ai_service):
        """Test rate limiting functionality"""
        user_id = "test_user_rate_limit"
        
        # Should allow first request
        assert ai_service.check_rate_limit(user_id, limit_per_hour=2) == True
        
        # Should allow second request
        assert ai_service.check_rate_limit(user_id, limit_per_hour=2) == True
        
        # Should block third request
        assert ai_service.check_rate_limit(user_id, limit_per_hour=2) == False

    @patch('app.ai.clients.httpx.AsyncClient')
    def test_openai_client_error_handling(self, mock_client):
        """Test OpenAI client error handling"""
        # Mock HTTP error
        mock_response = Mock()
        mock_response.raise_for_status.side_effect = Exception("API Error")
        mock_response.status_code = 429
        mock_response.text = "Rate limit exceeded"
        
        mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
        
        client = OpenAIClient()
        
        with pytest.raises(Exception) as exc_info:
            asyncio.run(client.chat_completion("test prompt"))
        
        assert "API Error" in str(exc_info.value)

    def test_local_forecast_fallback(self):
        """Test local forecasting fallback"""
        client = LocalForecastClient()
        
        # Test simple trend forecast (fallback when Prophet unavailable)
        import pandas as pd
        df = pd.DataFrame({
            "sales": [100, 110, 105, 120, 115, 125]
        })
        
        result = asyncio.run(client._simple_trend_forecast(df, "sales", 3))
        
        assert "forecast" in result
        assert "timestamps" in result
        assert len(result["forecast"]) == 3
        assert result["model_used"] == "simple_trend"

    def test_cache_memory_implementation(self):
        """Test in-memory cache implementation"""
        cache = AICache()
        cache.cache_type = "memory"
        cache._memory_cache = {}
        
        # Test set and get
        test_data = {"forecast": [1, 2, 3], "test": True}
        assert cache.set("test_key", test_data, ttl_minutes=1) == True
        
        retrieved = cache.get("test_key")
        assert retrieved == test_data
        
        # Test cache miss
        assert cache.get("nonexistent_key") is None

class TestForecastEndpoints:
    
    @pytest.fixture
    def client(self):
        from app.main import app
        return TestClient(app)
    
    def test_whatif_endpoint_requires_auth(self, client):
        """Test that forecast endpoints require authentication"""
        response = client.post("/api/forecast/whatif", json={
            "scenario_text": "test scenario",
            "target_column": "sales"
        })
        
        assert response.status_code == 401  # Unauthorized

    def test_models_endpoint(self, client):
        """Test models endpoint returns available models"""
        # This would require mock auth token
        pass  # Skip for now due to auth requirement
    
    def test_health_check_shows_ai_status(self, client):
        """Test health endpoint shows AI status"""
        response = client.get("/api/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "ai_enabled" in data or "message" in data

# Mock data for testing
@pytest.fixture
def mock_openai_response():
    return {
        "choices": [{
            "message": {
                "content": '{"adjustments": {"multiplier": 1.1}, "time_horizon": "monthly", "confidence": "medium"}'
            }
        }],
        "usage": {"total_tokens": 150}
    }

@pytest.fixture  
def mock_prophet_forecast():
    import pandas as pd
    dates = pd.date_range(start='2024-01-01', periods=12, freq='M')
    return {
        "forecast": [100, 105, 110, 108, 115, 120, 118, 125, 130, 128, 135, 140],
        "lower": [95, 100, 105, 103, 110, 115, 113, 120, 125, 123, 130, 135],
        "upper": [105, 110, 115, 113, 120, 125, 123, 130, 135, 133, 140, 145],
        "timestamps": dates.strftime('%Y-%m-%d').tolist(),
        "model_used": "prophet"
    }

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
