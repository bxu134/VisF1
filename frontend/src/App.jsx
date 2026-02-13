import { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot, ReferenceLine } from 'recharts';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
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

  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const indexRef = useRef(0);  
  const requestRef = useRef();
  const speedRef = useRef(1);

  const carDotRef = useRef(null);
  const speedDotRef = useRef(null); 
  const throttleDotRef = useRef(null); 
  const brakeDotRef = useRef(null); 

  const { viewBox, pathData, maxDist } = useMemo(() => {
    if (!data || data.length === 0) return { viewBox: "0 0 100 100", pathData: ""};

    const xVals = data.map(d => d.X);
    const yVals = data.map(d => d.Y);

    const padding = 500;
    const minX = Math.min(...xVals) - padding;
    const maxX = Math.max(...xVals) + padding;
    const minY = Math.min(...yVals) - padding;
    const maxY = Math.max(...yVals) + padding;
   
    const width = maxX - minX;
    const height = maxY - minY;
    
    const maxDist = Math.max(...data.map(d => d.Distance));

    const d = data.map((pt, i) =>
      `${i === 0 ? 'M' : 'L'} ${pt.X} ${pt.Y}`
    ).join(' ');

    return { 
      viewBox: `${minX} ${minY} ${width} ${height}`, 
      pathData: d,
      maxDist
    };
  }, [data]);

  useEffect(() => {
    speedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      cancelAnimationFrame(requestRef.current);
    } else {
      setIsPlaying(true);
      
      let startIdx = indexRef.current;
      if (startIdx >= data.length - 1) startIdx = 0;

      const timeOffset = data[startIdx].Time;
      setStartTime(Date.now() - ((timeOffset * 1000) / speedRef.current));
    }
  };

  const handleSpeedChange = (newSpeed) => {
    const speed = parseFloat(newSpeed);

    if (isPlaying && startTime) {
      const now = Date.now();
      const currVirtualTime = (now - startTime) * speedRef.current;
    
      setStartTime(now - (currentVirtualTime / speed));
    }

    setPlaybackSpeed(speed);
  };

  const animate = () => {
    if (!data || data.length === 0) return;

    const now = Date.now();
    const timeElapsed = ((now - startTime) * speedRef.current) / 1000;

    let idx = indexRef.current;
    while (idx < data.length - 1 && data[idx + 1].Time < timeElapsed) {
          idx++;
    }

    if (idx >= data.length - 1) {
      setIsPlaying(false);
      indexRef.current = 0; 
      setActiveIndex(0);
      return; 
    }

    indexRef.current = idx;

    const currPt = data[idx];
    const nextPt = data[idx + 1];
    const duration = nextPt.Time - currPt.Time;
    const progress = (timeElapsed - currPt.Time) / duration;
    const safeProgress = Math.max(0, Math.min(1, progress));

    const x = currPt.X + (nextPt.X - currPt.X) * safeProgress;
    const y = currPt.Y + (nextPt.Y - currPt.Y) * safeProgress;

    const dist = currPt.Distance + (nextPt.Distance - currPt.Distance) * safeProgress;
    const speed = currPt.Speed + (nextPt.Speed - currPt.Speed) * safeProgress;
    const throttle = currPt.Throttle + (nextPt.Throttle - currPt.Throttle) * safeProgress;
    const brake = currPt.Brake + (nextPt.Brake - currPt.Brake) * safeProgress;
    
    if (carDotRef.current) {
      carDotRef.current.setAttribute("cx", x);
      carDotRef.current.setAttribute("cy", y);
    }

    const xPct = (dist / maxDist) * 100;

    if (speedDotRef.current) {
      const yPct = 100 - (speed / 360 * 100); 
      speedDotRef.current.style.left = `${xPct}%`;
      speedDotRef.current.style.top = `${yPct}%`;
    }

    if (throttleDotRef.current) {
      const yPct = 100 - (throttle / 110 * 100);
      throttleDotRef.current.style.left = `${xPct}%`;
      throttleDotRef.current.style.top = `${yPct}%`;
    }
    if (brakeDotRef.current) {
      const yPct = 100 - (brake / 1.2 * 100);
      brakeDotRef.current.style.left = `${xPct}%`;
      brakeDotRef.current.style.top = `${yPct}%`;
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (data && data.length > 0 && data[activeIndex]) {
      const d = data[activeIndex];
      const xPct = (d.Distance / maxDist) * 100;

      if (speedDotRef.current) {
        speedDotRef.current.style.left = `${xPct}%`;
        speedDotRef.current.style.top = `${100 - (d.Speed / 360 * 100)}%`;
      }
      if (throttleDotRef.current) {
        throttleDotRef.current.style.left = `${xPct}%`;
        throttleDotRef.current.style.top = `${100 - (d.Throttle / 110 * 100)}%`;
      }
      if (brakeDotRef.current) {
        brakeDotRef.current.style.left = `${xPct}%`;
        brakeDotRef.current.style.top = `${100 - (d.Brake / 1.2 * 100)}%`;
      }
      if (carDotRef.current) {
        carDotRef.current.setAttribute("cx", d.X);
        carDotRef.current.setAttribute("cy", d.Y);
      }
    }
  }, [data, activeIndex, maxDist]); 

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, startTime, data]);

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
    setIsPlaying(false);
    setActiveIndex(0);
    indexRef.current = 0;

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
      const newIdx = Number(state.activeTooltipIndex);
      setIsPlaying(false); 
      setActiveIndex(newIdx);
      indexRef.current = newIdx;

      if (data && data[newIdx]) {
        const d = data[newIdx];
        if (carDotRef.current) {
          carDotRef.current.setAttribute("cx", d.X);
          carDotRef.current.setAttribute("cy", d.Y);
        }

        const xPct = (d.Distance / maxDist) * 100;

        if (speedDotRef.current) {
          speedDotRef.current.style.left = `${xPct}%`;
          speedDotRef.current.style.top = `${100 - (d.Speed / 360 * 100)}%`;
        }
        if (throttleDotRef.current) {
          throttleDotRef.current.style.left = `${xPct}%`;
          throttleDotRef.current.style.top = `${100 - (d.Throttle / 110 * 100)}%`;
        }
        if (brakeDotRef.current) {
          brakeDotRef.current.style.left = `${xPct}%`;
          brakeDotRef.current.style.top = `${100 - (d.Brake / 1.2 * 100)}%`;
        }
      }
    }
  };

  const OverlayDot = ({ innerRef, color }) => (
    <div 
      ref={innerRef}
      className="absolute w-3 h-3 rounded-full border border-white shadow-sm"
      style={{ 
        backgroundColor: color,
        transform: 'translate(-50%, -50%)', 
        pointerEvents: 'none',
        left: '0%', 
        top: '100%' 
      }}
    />
  );

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

          <select
            value={playbackSpeed}
            onChange={(e) => handleSpeedChange(e.target.value)}
            className="border border-gray-300 rounded h-9 px-2 bg-white text-sm focus:outline-none focus:border-blue-500 font-bold"
          >
            <option value="0.5">0.5x</option>
            <option value="1">1.0x</option>
            <option value="2">2.0x</option>
            <option value="5">5.0x</option>
          </select>
          <button onClick={togglePlay} className="bg-green-500 text-white px-4 py-1 h-9 rounded hover:bg-green-600 transition duration-200">{isPlaying ? "Pause" : "Play"}</button>
        </div>

      </div>

      {/* grid layout */}
      <div className="grid grid-cols-4 grid-rows-3 gap-4 h-[85vh]              w-[98vw] p-[2vw] bg-red-100">

        {/* speed graph */}
        <div className="flex col-span-2 row-span-2  p-4 rounded-xl shadow-md border border-black-200 relative flex-col         bg-green-200">
          <h3 className="font-bold text-gray-500 mb-2 uppercase text-xs">Speed (km/h)</h3>
          <div className="relative flex-grow min-h-0">
            <OverlayDot innerRef={speedDotRef} color="#ef4444" />
            
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} onMouseMove={handleHover} margin={{ top: 0, left: 0, right: 0, bottom: 0 }} syncId="f1">
                <XAxis dataKey="Distance" tick={false} type="number" domain={["dataMin","dataMax"]} hide />
                <YAxis domain={[0,360]} hide />
                <Tooltip 
                  isAnimationActive={false} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  formatter={(value) => value.toFixed(0)}
                  
                  labelFormatter={(label) => label.toFixed(2)}
                />
                {corners.map((c) =>(
                  <ReferenceLine key={c.number} x={Number(c.Distance)} stroke="#9ca3af" strokeDasharray="3 3" label={{ value: c.number, fill: '#5d636fff', position: 'insideBottom', fontSize: 16 }}/>
                ))}

                <Line type="monotone" dataKey="Speed" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false}/>
              </LineChart>
            </ResponsiveContainer>
         </div>
        </div>

        {/* throttle */}
        <div className="flex col-span-1 row-start-3 bg-white p-4 rounded-xl shadow-md border border-gray-200 flex-col relative">
          <h3 className="font-bold text-gray-500 mb-2 uppercase text-xs">Throttle %</h3>
          <div className="relative flex-grow min-h-0">
            <OverlayDot innerRef={throttleDotRef} color="#10b981" />
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} onMouseMove={handleHover} margin={{ top: 0, left: 0, right: 0, bottom: 0 }} syncId="f1">
                <XAxis dataKey="Distance" hide type="number" domain={["dataMin","dataMax"]}/>
                <YAxis domain={[0, 110]} hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  formatter={(value) => (value == 100 || value == 0) ? Math.round(value) : value.toFixed(2)}
                 labelFormatter={() => ""} 
                />
                <Line type="step" dataKey="Throttle" stroke="#10b981" strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* brake */}
        <div className="flex col-span-1 row-start-3 bg-white p-4 rounded-xl shadow-md border border-gray-200 flex-col relative">
          <h3 className="font-bold text-gray-500 mb-2 uppercase text-xs">Brake</h3>
          <div className="relative flex-grow min-h-0">
            <OverlayDot innerRef={brakeDotRef} color="#f59e0b" />
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} onMouseMove={handleHover} margin={{ top: 0, left: 0, right: 0, bottom: 0 }} syncId="f1">
                <XAxis dataKey="Distance" hide type="number" domain={["dataMin","dataMax"]}/>
                <YAxis domain={[0, 1.2]} hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  formatter={(value) => value > 0 ? "ON" : "OFF"}
                  labelFormatter={() => ""} 
                />

                <Line type="step" dataKey="Brake" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* track map */} 
        <div className="relative flex flex-col col-span-2 row-span-3 bg-white p-6 rounded-xl shadow-md border border-gray-200 ">
          <h3 className="font-bold text-gray-500 mb-2 uppercase text-xs">Track Map</h3>
          <div className="flex-grow min-h-0 relative flex items-center justify-center bg-slate-50 rounded-lg overflow-hidden">
            
            <svg 
              viewBox={viewBox} 
              className="w-full h-full" 
              preserveAspectRatio="xMidYMid meet"
              style={{ transform: 'scale(0.9)' }} 
            >
              <path 
                d={pathData} 
                fill="none" 
                stroke="#374151" 
                strokeWidth="200" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />

              {corners.map((corner, i) => (
                <g key={i}>
                  <circle cx={corner.X} cy={corner.Y} r="350" fill="white" stroke="#9ca3af" strokeWidth="50" />
                  <text 
                    x={corner.X} 
                    y={corner.Y} 
                    fill="#374151" 
                    fontSize="350" 
                    fontWeight="bold" 
                    textAnchor="middle" 
                    dominantBaseline="central"
                  >
                    {corner.number}
                  </text>
                </g>
              ))}

              <circle 
                ref={carDotRef}
                r="300"
                fill="#ef4444" 
                stroke="white" 
                strokeWidth="100"
                cx={data && data[activeIndex] ? data[activeIndex].X : 0}
                cy={data && data[activeIndex] ? data[activeIndex].Y : 0}
              />
            </svg>

          </div>
          </div>

      </div>
    </div>
  );
}

export default App;