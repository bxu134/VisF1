from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import fastf1
import os

# save downloaded race data
cache_dir = 'cache'
if not os.path.exists(cache_dir):
    os.makedirs(cache_dir)
fastf1.Cache.enable_cache(cache_dir)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
def home():
    return {"message": "api running. go to /api/race_data for telemetry data"}

@app.get("/api/race-data")
def get_race_data(d1: str, d2: str = None):
    # hardcode abu dhabi for testing
    year = 2025
    gp = "Abu Dhabi"
    session_type = "Q"

    try:
        session = fastf1.get_session(year, gp, session_type)
        session.load()

        def get_driver_telemetry(d_code):
            laps = session.laps.pick_drivers(d_code)
            if laps.empty:
                return None

            fastest = laps.pick_fastest()
            telemetry = fastest.get_telemetry()
            telemetry = telemetry.iloc[::1].copy() # add option to change "detail"
            telemetry['Distance'] = telemetry['Distance']            

            telemetry['Brake'] = telemetry['Brake'].astype(int)

            return telemetry[['Distance', 'Speed', 'Throttle', 'Brake', 'X', 'Y']].to_dict(orient='records')

        d1_data = get_driver_telemetry(d1)
        if not d1_data:
            raise HTTPException(status_code=404, detail=f"Driver {d1} not found")

        response = {
            "driver1": {
                "code": d1,
                "data": d1_data
            }
        }
    
        if d2:
            d2_data = get_driver_telemetry(d2)
            if not d2_data:
                raise HTTPException(status_code=404, detail=f"Driver {d2} not found")
            else:
                response["driver2"] = {
                    "code": d2,
                    "data": d2_data
                }
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
