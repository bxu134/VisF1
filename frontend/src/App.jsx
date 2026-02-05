import { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot, ReferenceLine} from 'recharts';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(null);
  const [corners, setCorners] = useState([]);

  const [year, setYear] = useState(2025);
  const [gp, setGp] = useState('Abu Dhabi');
  const [driver, setDriver] = useState('VER');

  const [eventsList, setEventsList] = useState([]);
  const [driversList, setDriversList] = useState([]);

  const currYear = new Date().getFullYear();
  const yearOptions = Array.from( 
    { length: currYear - 2018 + 1 },
    (_, i) => 2018 + i
  );


  useEffect(() => {
    axios.get(`http://localhost:8000/api/schedule?year=${year}`)
      .then(res => {
        setEventsList(res.data.events);
        if (res.data.events.length > 0) {
          if (!res.data.events.includes(gp)) setGp(res.data.events[0]);
        }
      })
      .catch(err => {console.error("Error fetching schedule", err)});
  }, [year]);

  useEffect(() => {
    if (year && gp) {
      axios.get(`http://localhost:8000/api/drivers?year=${year}&gp=${gp}`)
        .then(res => {
          setDriversList(res.data.drivers);
          if (res.data.drivers.length > 0) {
            if (!res.data.drivers.includes(driver)) setDriver(res.data.drivers[0]);
          }
        })
        .catch(err => {console.error("Error fetching schedule", err)});
    }
  }, [year, gp])

  const fetchTelemetry = () => {
    setLoading(true);
    axios.get(`http://localhost:8000/api/race-data?year=${year}&gp=${gp}&d1=${driver}`)
      .then(res => {
        setData(res.data.driver1.data);
        setCorners(res.data.circuit_info.corners);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        alert("Error fetching data. Check inputs.");
      });
  }
  // fetch race telemetry
  useEffect(() => {
    fetchTelemetry();
  }, []);
  
  if (loading) {
    return <div className="h-screen flex items-center justify-center text-2xl font-bold">Loading Telemetry...</div>
  }

  const handleHover = (state) => {
    if (state && state.activeTooltipIndex !== undefined) {
      setActiveIndex(state.activeTooltipIndex);
    }
  };

  
  return (
    <div className="h-screen p-4 font-sans         w-screen bg-blue-300">
      {/* header */}
      <div className="mb-4 flex justify-around items-center           bg-green-100">
        <h1 className="text-3xl font-bold text-gray-800">VisF1 Dashboard</h1>
        {/* input controls for track/year/driver selection */}
        <div className="flex gap-2 items-center">
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="border border-gray-300 rounded h-9 px-2 bg-white text-sm focus:outline-none focus:border-blue-500"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={gp}
            onChange={(e) => setGp(e.target.value)}
            className="border border-gray-300 rounded w-48 h-9 px-2 bg-white text-sm focus:outline-none focus:border-blue-500"
          >
            {eventsList.map((e, idx) => (
              <option key={idx} value={e}>{e}</option>
            ))}
          </select>
          <select
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
            className="border border-gray-300 rounded w-24 h-9 px-2 bg-white text-sm focus:outline-none focus:border-blue-500"
          >
            {driversList.map((d, idx) => (
              <option key={idx} value={d}>{d}</option>
            ))}
          </select>
          <button onClick={fetchTelemetry} className="bg-gray-300 text-black px-4 py-1 h-9 rounded hover:bg-blue-300 transition duration-200">
            Load
          </button>
        </div>

      </div>

      {/* grid layout */}
      {/* something wrong with the grid layout -> item placements+halfscreen? */}
      <div className="grid grid-cols-4 grid-rows-3 gap-4 h-[85vh]              w-[98vw] p-[2vw] bg-red-100">

        {/* speed graph */}
        <div className="col-span-2 row-span-2  p-4 rounded-xl shadow-md border border-black-200          bg-green-200">
          <h3 className="font-bold text-gray-500 mb-2 uppercase text-xs">Speed (km/h)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} onMouseMove={handleHover} syncId="f1" >
              <XAxis dataKey="Distance" tick={false} type="number" domain={["dataMin","dataMax"]}/>
              <YAxis domain={[0,360]} hide />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                formatter={(value) => value.toFixed(2)}
                labelFormatter={(label) => label.toFixed(2)} 
              />
              {corners.map((corner) =>(
                <ReferenceLine
                  key={corner.number}
                  x={Number(corner.Distance)}
                  stroke="gray"
                  strokeDasharray="5 5" 
                  ifOverflow="extendDomain"
                />
                  
              ))}
              {corners.map((corner) => (
              <ReferenceDot 
                    key={corner.number}
                    x={Number(corner.Distance)}
                    y={0}
                    r={14}
                    fill="white"
                    stroke="gray"
                    label={{
                      value: corner.number,
                    position: 'center',
                    fill: 'black',
                    fontSize: 12,
                    fontWeight: 'bold'
                    }}
                    ifOverflow="extendDomain"
                  />
              ))}

              <Line type="monotone" dataKey="Speed" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={false}/>
              {activeIndex !== null && <ReferenceDot x={data[activeIndex].Distance} y={data[activeIndex].Speed} r={6} fill="#ef4444" stroke="white" strokeWidth={2} />}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* throttle */}
        <div className="col-span-1 row-start-3 bg-white p-4 rounded-xl shadow-md border border-gray-200">
          <h3 className="font-bold text-gray-500 mb-2 uppercase text-xs">Throttle %</h3>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={data} onMouseMove={handleHover} syncId="f1">
              <XAxis dataKey="Distance" hide type="number" domain={["dataMin","dataMax"]}/>
              <YAxis domain={[0, 110]} hide />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                formatter={(value) => (value == 100 || value == 0) ? Math.round(value) : value.toFixed(2)}
                labelFormatter={(label) => label.toFixed(2)} 
              />
              <Line type="step" dataKey="Throttle" stroke="#10b981" strokeWidth={2} dot={false} activeDot={false}/>
              {activeIndex !== null && <ReferenceDot x={data[activeIndex].Distance} y={data[activeIndex].Throttle} r={5} fill="#10b981" stroke="white" strokeWidth={2} />}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* brake */}
        {/* brake was actually converted to boolean value in recent versions of fastf1, need to change data vis */}
        <div className="col-span-1 row-start-3 bg-white p-4 rounded-xl shadow-md border border-gray-200">
          <h3 className="font-bold text-gray-500 mb-2 uppercase text-xs">Brake</h3>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={data} onMouseMove={handleHover} syncId="f1">
              <XAxis dataKey="Distance" hide type="number" domain={["dataMin","dataMax"]}/>
              <YAxis domain={[0, 1.2]} hide />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                formatter={(value) => (value == 1 || value == 0) ? Math.round(value) : value.toFixed(2)}
                labelFormatter={(label) => label.toFixed(2)} 
              />
              <Line type="step" dataKey="Brake" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={false}/>
              {activeIndex !== null && <ReferenceDot x={data[activeIndex].Distance} y={data[activeIndex].Brake} r={5} fill="#f59e0b" stroke="white" strokeWidth={2} />}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* track map */} 
        {/* ISSUE: track map hover dot is jumpy? maybe fixed with bigger map */}
        <div className="flex flex-col col-span-2 row-span-3 bg-white p-6 rounded-xl shadow-md border border-gray-200 ">
          <h3 className="font-bold text-gray-500 mb-2 uppercase text-xs">Track Map</h3>
          <ResponsiveContainer width="95%" height="95%" className="bg-blue-200 mx-auto my-auto">
            <LineChart data={data}>
              <XAxis dataKey="X" type="number" hide domain={['dataMin', 'dataMax']} />
              <YAxis dataKey="Y" type="number" hide domain={['dataMin', 'dataMax']} />
              <Line type="linear" dataKey="Y" stroke="#1f2937" strokeWidth={3} dot={false} isAnimationActive={false} activeDot={false}/>
              
              {corners.map((corner) => (
                <ReferenceDot
                  key={corner.number}
                  x={corner.X}
                  y={corner.Y}
                  r={16}
                  fill="white"
                  stroke="gray"
                  strokeWidth={2}
                  isFront={true}
                  label={{
                    value: corner.number,
                    position: 'center',
                    fill: 'black',
                    fontSize: 16,
                    fontWeight: 'bold',
                  }}
                />
              ))}

              {/* car dot */}
              {activeIndex !== null && data[activeIndex] && (
                <ReferenceDot 
                  x={data[activeIndex].X} 
                  y={data[activeIndex].Y} 
                  r={8} 
                  fill="#ef4444" 
                  stroke="white"
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}

export default App;