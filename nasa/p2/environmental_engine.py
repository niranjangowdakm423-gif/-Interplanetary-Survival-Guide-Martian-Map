"""
ARES-NAV Phase P2.1 — Environmental Observations Engine
NASA In-Situ PDS Ingestion (Mars 2020 MEDA & MSL REMS) & Climatological Context
"""

import json
import math
import os
from typing import Dict, Any, Optional

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_DIR = os.path.join(BASE_DIR, "real_nasa_data", "environmental")

_MEDA_DATA = None
_REMS_DATA = None


def load_environmental_catalogs() -> None:
    """
    Loads pre-indexed real NASA PDS archival data records.
    """
    global _MEDA_DATA, _REMS_DATA
    if _MEDA_DATA is None:
        meda_path = os.path.join(ENV_DIR, "meda_jezero_samples.json")
        if os.path.exists(meda_path):
            with open(meda_path, "r", encoding="utf-8") as f:
                _MEDA_DATA = json.load(f)
        else:
            _MEDA_DATA = {}
            
    if _REMS_DATA is None:
        rems_path = os.path.join(ENV_DIR, "rems_gale_samples.json")
        if os.path.exists(rems_path):
            with open(rems_path, "r", encoding="utf-8") as f:
                _REMS_DATA = json.load(f)
        else:
            _REMS_DATA = {}


def get_environmental_context(site_id: str, sol: Optional[int] = None, site_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Delivers grounded environmental telemetry.
    Strictly separates real in-situ observations (MEDA/REMS) from modeled climatology.
    Never mislabels historical or modeled data as live weather.
    """
    load_environmental_catalogs()
    site_key = site_id.lower().strip()
    
    # 1. Jezero Crater -> Real Mars 2020 MEDA Data
    if site_key == "jezero":
        sols_dict = _MEDA_DATA.get("sols", {})
        selected_sol = str(sol) if sol and str(sol) in sols_dict else "89"
        sol_record = sols_dict.get(selected_sol)
        
        return {
            "site_id": "jezero",
            "in_situ_station_present": True,
            "station_name": "Mars Environmental Dynamics Analyzer (MEDA)",
            "spacecraft": "Mars 2020 Perseverance",
            "pds_bundle": _MEDA_DATA.get("pds_bundle", "urn:nasa:pds:mars2020_meda"),
            "data_provenance": "VERIFIED_NASA_PDS_OBSERVATION",
            "historical_sol": int(selected_sol),
            "available_archival_sols": [int(s) for s in sols_dict.keys()],
            "sol_observation": sol_record,
            "sensor_sampling_strategy": _MEDA_DATA.get("sensor_sampling_strategy", {}),
            "scientific_disclaimer": (
                "HISTORICAL_ARCHIVAL_DATA_ONLY: In-situ observations acquired on historical Martian sols. "
                "Not a live weather broadcast. Data calibrated by NASA JPL / CAB INTA-CSIC MEDA science team."
            )
        }
        
    # 2. Gale Crater -> Real MSL REMS Data
    elif site_key == "gale":
        sols_dict = _REMS_DATA.get("sols", {})
        selected_sol = str(sol) if sol and str(sol) in sols_dict else "1000"
        sol_record = sols_dict.get(selected_sol)
        
        return {
            "site_id": "gale",
            "in_situ_station_present": True,
            "station_name": "Rover Environmental Monitoring Station (REMS)",
            "spacecraft": "Mars Science Laboratory Curiosity",
            "pds_dataset_id": _REMS_DATA.get("pds_dataset_id", "MSL-M-REMS-4-RDR-V1.0"),
            "data_provenance": "VERIFIED_NASA_PDS_OBSERVATION",
            "historical_sol": int(selected_sol),
            "available_archival_sols": [int(s) for s in sols_dict.keys()],
            "sol_observation": sol_record,
            "sensor_sampling_strategy": _REMS_DATA.get("sensor_sampling_strategy", {}),
            "scientific_disclaimer": (
                "HISTORICAL_ARCHIVAL_DATA_ONLY: In-situ observations acquired in Gale Crater on historical sols. "
                "Subject to local Mount Sharp katabatic boundary-layer effects. Not a live broadcast."
            )
        }
        
    # 3. Secondary Exploration Sites -> Analytical Hydrostatic Barometric Model
    else:
        elev = site_metadata.get("elevation_m", -2500.0) if site_metadata else -2500.0
        # Barometric scale height scaling: P = P0 * exp(-z / H), P0 ~ 610.5 Pa at datum, H ~ 10.8 km
        scale_height_m = 10800.0
        pressure_estimate_pa = round(610.5 * math.exp(-elev / scale_height_m), 1)
        
        return {
            "site_id": site_key,
            "in_situ_station_present": False,
            "data_provenance": "ANALYTICAL_HYDROSTATIC_MODEL",
            "model_framework": "Analytical Hydrostatic Barometric Model (Scaled to MOLA Elevation)",
            "climatological_summary": {
                "estimated_surface_pressure_pa": pressure_estimate_pa,
                "elevation_datum_m": elev,
                "pressure_scaling_basis": "Hydrostatic barometric equation P = P0 * exp(-z / H), P0=610.5 Pa, H=10.8 km",
                "modeled_wind_regime": "Regional slope and trade winds (1.5m agl)",
                "estimated_wind_speed_mean_mps": 5.5,
                "optical_depth_tau_baseline": 0.40
            },
            "scientific_disclaimer": (
                f"ANALYTICAL_MODEL_ONLY: No in-situ surface weather station exists at {site_id.title()}. "
                "Surface pressure is evaluated analytically via the hydrostatic barometric equation (P0=610.5 Pa, H=10.8 km) "
                "scaled against MOLA topography. Wind and optical depth represent generalized Martian climatological baselines, "
                "NOT raw NASA Ames FV3-MGCM NetCDF simulation runs. Never treat uninstrumented analytical models as local in-situ ground truth."
            )
        }
