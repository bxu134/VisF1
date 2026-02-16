from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import fastf1
import os
import numpy as np


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

def rotate_point(x, y, angle):
    x_p = x * np.cos(angle) - y * np.sin(angle)
    y_p = x * np.sin(angle) + y * np.cos(angle)
    return x_p, y_p

@app.get("/")
def home():
    return {"message": "api running. go to /api/race_data for telemetry data"}

@app.get("/api/schedule")
def get_schedule(year: int):
    try:
        schedule = fastf1.get_event_schedule(year)
        valid_events = schedule[~schedule['EventName'].str.contains('Testing', case=False)]
        event_names = valid_events['EventName'].tolist()
        return {"events": event_names}
    except Exception as e:
        print(f"Error fetching schedule: {e}")
        return {"events": []}

@app.get("/api/drivers")
def get_session_drivers(year: int, gp: str):
    try:
        session = fastf1.get_session(year, gp, 'Q')
        session.load(telemetry=False, weather=False, messages=False)

        d_list = []
        for d_num in session.drivers:
            drv = session.get_driver(d_num)
            d_list.append(drv['Abbreviation'])
    
        return {"drivers": d_list}
    except Exception as e:
        print(f"Error fetching drivers: {e}:")
        return {"drivers": []}

@app.get("/api/race-data")
def get_race_data(year: int, gp: str, d1: str, d2: str = None):
    session_type = "Q"

    try:
        session = fastf1.get_session(year, gp, session_type)
        session.load(telemetry=False, weather=False, messages=False)

        circuit_info = session.get_circuit_info()
        track_angle = circuit_info.rotation/180 * np.pi

        def get_driver_telemetry(d_code):
            laps = session.laps.pick_drivers(d_code)
            if laps.empty:
                return None

            fastest = laps.pick_fastest()
            telemetry = fastest.get_telemetry()
            telemetry = telemetry.iloc[::4].copy() # add option to change "detail"
            telemetry['Distance'] = telemetry['Distance']

            telemetry['X'], telemetry['Y'] = rotate_point(
                telemetry['X'].values,
                telemetry['Y'].values,
                track_angle
            )           

            telemetry['Brake'] = telemetry['Brake'].astype(int)

            telemetry['Time'] = telemetry['Time'].dt.total_seconds()
            telemetry['Time'] = telemetry['Time'] - telemetry['Time'].iloc[0]

            return telemetry[['Distance', 'Speed', 'Throttle', 'Brake', 'X', 'Y', 'Time']].to_dict(orient='records')

        corner_data = []
        for _, corner in circuit_info.corners.iterrows():
            cx, cy = rotate_point(corner['X'], corner['Y'], track_angle)

            corner_data.append({
                "number": f"{corner['Number']}{corner['Letter']}",
                "X": cx,
                "Y": cy,
                "Distance": corner['Distance']
            })

        d1_data = get_driver_telemetry(d1)
        if not d1_data:
            raise HTTPException(status_code=404, detail=f"Driver {d1} not found")

        response = {
            "circuit_info": {
                "corners": corner_data
            },
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
