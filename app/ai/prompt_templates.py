# app/ai/prompt_templates.py

SCENARIO_PARSER_TEMPLATE = """
Parse this business scenario into structured parameters for forecasting:

Scenario: "{scenario}"
Available columns: {available_columns}

Extract:
1. Percentage changes (e.g., "increase 10%" -> 1.1 multiplier)
2. Target adjustments for specific metrics
3. Time horizon (monthly, quarterly, yearly)
4. Confidence level (high, medium, low)

Respond with valid JSON only:
{{
  "adjustments": {{
    "multiplier": 1.0,
    "specific_changes": {{}}
  }},
  "target_change": 0,
  "time_horizon": "monthly",
  "confidence": "medium"
}}
"""

EXPLANATION_TEMPLATE = """
Generate a concise explanation for this forecast:

Target: {target_column}
Data summary: {data_summary}
Scenario applied: {scenario}
Forecast values (first 5): {forecast_values}
Model used: {model_used}

Write 2-3 sentences explaining:
1. What the forecast shows
2. How the scenario influenced results
3. Key insights or trends

Keep it business-friendly and avoid technical jargon.
"""

DATA_SUMMARIZATION_TEMPLATE = """
Summarize this dataset for forecasting context:

Columns: {columns}
Sample data: {sample_rows}
Target column: {target_column}

Provide a 1-2 sentence summary focusing on:
- Data type and business context
- Key patterns or seasonality
- Data quality observations
"""

FORECAST_VALIDATION_TEMPLATE = """
Review this forecast for reasonableness:

Historical data range: {historical_range}
Forecast values: {forecast_values}
Applied scenario: {scenario}

Rate the forecast as: REASONABLE, QUESTIONABLE, or UNREALISTIC
Explain your assessment in 1-2 sentences.

If QUESTIONABLE or UNREALISTIC, suggest adjustments.
"""
