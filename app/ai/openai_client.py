# app/ai/openai_client.py
import os
import asyncio
import logging
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

class OpenAIClient:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("AI_DEFAULT_MODEL", "gpt-4o-mini")
        self.timeout = int(os.getenv("AI_TIMEOUT_SECONDS", "30"))
        self.base_url = "https://api.openai.com/v1"
        
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        logger.info(f"OpenAI client initialized with model: {self.model}")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def chat_completion(
        self,
        prompt: str,
        max_tokens: int = 1000,
        temperature: float = 0.7,
        model: str = None
    ) -> str:
        """Send chat completion request to OpenAI API"""
        
        model_to_use = model or self.model
        
        payload = {
            "model": model_to_use,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a helpful data analyst assistant. Respond concisely and accurately."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers
                )
                
                if response.status_code == 429:
                    logger.warning("OpenAI rate limit hit")
                    raise Exception("Rate limit exceeded")
                elif response.status_code == 401:
                    logger.error("Invalid OpenAI API key")
                    raise Exception("Invalid API key")
                elif response.status_code != 200:
                    logger.error(f"OpenAI API error: {response.status_code}")
                    raise Exception(f"API error: {response.status_code}")
                
                result = response.json()
                
                if "choices" not in result or not result["choices"]:
                    raise ValueError("No response choices returned from OpenAI")
                
                content = result["choices"][0]["message"]["content"].strip()
                
                # Log usage
                usage = result.get("usage", {})
                logger.info(f"OpenAI tokens used: {usage.get('total_tokens', 0)}")
                
                return content
                
            except httpx.TimeoutException:
                logger.error("OpenAI request timed out")
                raise Exception("Request timed out")
            except httpx.RequestError as e:
                logger.error(f"OpenAI request failed: {e}")
                raise Exception("Network error")
            except Exception as e:
                if "Rate limit" in str(e) or "rate limit" in str(e):
                    raise Exception("OpenAI API rate limit exceeded")
                elif "API key" in str(e) or "Unauthorized" in str(e):
                    raise Exception("Invalid OpenAI API key")
                else:
                    logger.error(f"OpenAI API call failed: {e}")
                    raise
