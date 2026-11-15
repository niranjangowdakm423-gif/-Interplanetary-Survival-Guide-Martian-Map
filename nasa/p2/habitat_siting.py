"""
ARES-NAV Phase P2.2 — Habitat Siting Alias Module
Re-exports all functions and constants from p2.habitat_suitability for full
compatibility with P2_IMPLEMENTATION_PLAN.md and NEXT_DEVELOPER_START_HERE.md.
"""

from p2.habitat_suitability import (
    SAATY_RI_TABLE,
    DEFAULT_AHP_MATRIX_6X6,
    CRITERIA_KEYS,
    compute_ahp_weights,
    compute_directional_sky_view_factor,
    compute_slope_factor_score,
    compute_boulder_factor_score,
    compute_daily_solar_insolation_score,
    compute_isru_proximity_score,
    compute_horizon_masking_score,
    evaluate_habitat_suitability,
)
