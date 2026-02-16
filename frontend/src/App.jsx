import { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [corners, setCorners] = useState([]);

  const [year, setYear] = useState(2025);
  const [gp, setGp] = useState('Australia');
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
    
      setStartTime(now - (currVirtualTime / speed));
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

  const API_URL = "https://visf1.onrender.com";

  // const API_URL = "http://127.0.0.1:8000";
  useEffect(() => {
    document.title = `VisF1 - ${gp}`;
  }, [gp]); 

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, startTime, data]);

  useEffect(() => {
    axios.get(`${API_URL}/api/schedule?year=${year}`)
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
      axios.get(`${API_URL}/api/drivers?year=${year}&gp=${gp}`)
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

    axios.get(`${API_URL}/api/race-data?year=${year}&gp=${gp}&d1=${driver}`)
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
    return (
      <div className="h-screen w-full bg-neutral-950 flex flex-col items-center justify-center gap-4 text-neutral-400">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm font-mono tracking-widest uppercase animate-pulse">
          Downloading Telemetry from FIA...
        </div>
        <div className="text-xs text-neutral-600 font-mono">
          (First load can take 15-20 seconds)
        </div>
      </div>
    )
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
      className="absolute w-3 h-3 rounded-full border border-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20"
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
    <div className="h-screen w-full bg-neutral-950 text-neutral-200 font-sans p-6 overflow-hidden flex flex-col selection:bg-red-500/30">
      
      {/* header */}
      <div className="mb-6 flex justify-between items-center border-b border-neutral-800 pb-6">
        <div className="flex flex-col">
            <h1 className="text-3xl font-black italic tracking-tighter text-white">
                Vis<span className="text-red-600">F1</span>
                <span className="text-neutral-500 text-lg not-italic font-normal ml-3 tracking-normal">Telemetry Dashboard</span>
            </h1>
        </div>

        {/* input controls */}
        <div className="flex gap-3 items-center bg-neutral-900 p-2 rounded-xl border border-neutral-800 shadow-lg">
          <div className="flex gap-1 items-center px-2 border-r border-neutral-700/50">
            <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-lg h-9 px-3 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-red-600 transition-colors"
            >
                {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
                ))}
            </select>
            <select
                value={gp}
                onChange={(e) => setGp(e.target.value)}
                className="bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-lg h-9 px-3 w-40 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-red-600 transition-colors"
            >
                {eventsList.map((e, idx) => (
                <option key={idx} value={e}>{e}</option>
                ))}
            </select>
            <select
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                className="bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-lg h-9 px-3 w-24 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-red-600 transition-colors"
            >
                {driversList.map((d, idx) => (
                <option key={idx} value={d}>{d}</option>
                ))}
            </select>
          </div>
          
          <button 
            onClick={fetchTelemetry} 
            className="bg-white text-black text-sm font-bold px-5 py-1.5 h-9 rounded-lg hover:bg-neutral-200 transition duration-200"
          >
            Load
          </button>

          <div className="w-px h-6 bg-neutral-700/50 mx-1"></div>

          <select
            value={playbackSpeed}
            onChange={(e) => handleSpeedChange(e.target.value)}
            className="bg-neutral-950 text-neutral-400 text-xs font-mono rounded h-9 px-2 border border-neutral-800 focus:outline-none focus:border-red-600"
          >
            <option value="0.5">0.5x</option>
            <option value="1">1.0x</option>
            <option value="2">2.0x</option>
            <option value="5">5.0x</option>
          </select>
          <button 
            onClick={togglePlay} 
            className={`px-6 py-1.5 h-9 rounded-lg text-sm font-bold transition duration-200 flex items-center gap-2 ${
                isPlaying 
                ? "bg-red-600/10 text-red-500 hover:bg-red-600/20 border border-red-600/20" 
                : "bg-green-600 text-white hover:bg-green-500 shadow-[0_0_15px_rgba(22,163,74,0.4)]"
            }`}
          >
            {isPlaying ? "Pause" : "Play Analysis"}
          </button>
        </div>

      </div>

      {/* grid layout */}
      <div className="grid grid-cols-4 grid-rows-3 gap-6 h-full pb-4">

        {/* speed graph */}
        <div className="col-span-2 row-span-2 bg-neutral-900/50 backdrop-blur rounded-2xl border border-neutral-800 p-5 shadow-xl flex flex-col relative group">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-mono text-neutral-500 text-xs uppercase tracking-widest font-bold">Velocity Data</h3>
            <span className="text-xs font-mono text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">LIVE TEL</span>
          </div>
          
          <div className="relative flex-grow min-h-0">
            <OverlayDot innerRef={speedDotRef} color="#ef4444" />
            
            <ResponsiveContainer width="100%" height="100%">
              {/* REVERTED MARGIN TO 0 TO FIX ALIGNMENT */}
              <LineChart data={data} onMouseMove={handleHover} margin={{ top: 0, left: 0, right: 0, bottom: 0 }} syncId="f1">
                <XAxis dataKey="Distance" tick={false} type="number" domain={["dataMin","dataMax"]} hide />
                <YAxis domain={[0,360]} hide />
                <Tooltip 
                  isAnimationActive={false} 
                  contentStyle={{ backgroundColor: '#171717', borderRadius: '8px', border: '1px solid #333', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#ef4444', fontFamily: 'monospace' }}
                  labelStyle={{ color: '#666', marginBottom: '0.25rem', fontSize: '0.75rem' }}
                  formatter={(value) => [`${value.toFixed(0)} km/h`, 'Speed']}
                  labelFormatter={(label) => `Dist: ${label.toFixed(0)}m`}
                  cursor={{ stroke: '#404040', strokeWidth: 1 }}
                />
                {corners.map((c) =>(
                  <ReferenceLine 
                    key={c.number} 
                    x={Number(c.Distance)} 
                    stroke="#404040" 
                    strokeDasharray="3 3" 
                    label={{ value: c.number, fill: '#666', position: 'insideBottom', fontSize: 12 }}
                />
                ))}

                <Line 
                    type="monotone" 
                    dataKey="Speed" 
                    stroke="#ef4444" 
                    strokeWidth={2} 
                    dot={false} 
                    activeDot={{ r: 4, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} 
                    isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
         </div>
        </div>

        {/* throttle */}
        <div className="col-span-1 row-start-3 bg-neutral-900/50 backdrop-blur rounded-2xl border border-neutral-800 p-5 shadow-xl flex flex-col relative">
          <h3 className="font-mono text-neutral-500 text-xs uppercase tracking-widest font-bold mb-4">Throttle Input</h3>
          <div className="relative flex-grow min-h-0">
            <OverlayDot innerRef={throttleDotRef} color="#10b981" />
            <ResponsiveContainer width="100%" height="100%">
              {/* REVERTED MARGIN TO 0 TO FIX ALIGNMENT */}
              <LineChart data={data} onMouseMove={handleHover} margin={{ top: 0, left: 0, right: 0, bottom: 0 }} syncId="f1">
                <XAxis dataKey="Distance" hide type="number" domain={["dataMin","dataMax"]}/>
                <YAxis domain={[0, 110]} hide />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#171717', borderRadius: '8px', border: '1px solid #333', color: '#fff' }}
                   itemStyle={{ color: '#10b981', fontFamily: 'monospace' }}
                  formatter={(value) => [`${Math.round(value)}%`, 'Throttle']}
                  labelFormatter={() => ""} 
                />
                <Line 
                    type="step" 
                    dataKey="Throttle" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    dot={false} 
                    activeDot={false} 
                    isAnimationActive={false}
                    fill="url(#gradientThrottle)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* brake */}
        <div className="col-span-1 row-start-3 bg-neutral-900/50 backdrop-blur rounded-2xl border border-neutral-800 p-5 shadow-xl flex flex-col relative">
          <h3 className="font-mono text-neutral-500 text-xs uppercase tracking-widest font-bold mb-4">Brake Pressure</h3>
          <div className="relative flex-grow min-h-0">
            <OverlayDot innerRef={brakeDotRef} color="#f59e0b" />
            <ResponsiveContainer width="100%" height="100%">
              {/* REVERTED MARGIN TO 0 TO FIX ALIGNMENT */}
              <LineChart data={data} onMouseMove={handleHover} margin={{ top: 0, left: 0, right: 0, bottom: 0 }} syncId="f1">
                <XAxis dataKey="Distance" hide type="number" domain={["dataMin","dataMax"]}/>
                <YAxis domain={[0, 1.2]} hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171717', borderRadius: '8px', border: '1px solid #333', color: '#fff' }}
                  itemStyle={{ color: '#f59e0b', fontFamily: 'monospace' }}
                  formatter={(value) => [value > 0 ? "ON" : "OFF", 'Brake']}
                  labelFormatter={() => ""} 
                />

                <Line type="step" dataKey="Brake" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* track map */} 
        <div className="col-span-2 row-span-3 bg-neutral-900/80 backdrop-blur rounded-2xl border border-neutral-800 p-6 shadow-xl relative overflow-hidden flex flex-col">
          {/* REMOVED DECORATIVE CROSS ARTIFACT */}
          <h3 className="font-mono text-neutral-500 text-xs uppercase tracking-widest font-bold mb-2 z-10">Circuit Map</h3>
          
          <div className="flex-grow min-h-0 relative flex items-center justify-center rounded-lg">
            <svg 
              viewBox={viewBox} 
              className="w-full h-full drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
              preserveAspectRatio="xMidYMid meet"
              style={{ transform: 'scale(0.95)' }} 
            >
              <defs>
                {/* INCREASED FILTER REGION TO PREVENT CLIPPING */}
                <filter id="glow" x="-500%" y="-500%" width="1000%" height="1000%">
                  <feGaussianBlur stdDeviation="100" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Track Path */}
              <path 
                d={pathData} 
                fill="none" 
                stroke="#404040" 
                strokeWidth="200" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              <path 
                d={pathData} 
                fill="none" 
                stroke="#d4d4d4" 
                strokeWidth="80" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />

              {/* Corners */}
              {corners.map((corner, i) => (
                <g key={i}>
                  <circle cx={corner.X} cy={corner.Y} r="150" fill="#171717" stroke="#525252" strokeWidth="30" />
                  <text 
                    x={corner.X} 
                    y={corner.Y} 
                    fill="#a3a3a3" 
                    fontSize="250" 
                    fontFamily="monospace"
                    fontWeight="bold" 
                    textAnchor="middle" 
                    dominantBaseline="central"
                  >
                    {corner.number}
                  </text>
                </g>
              ))}

              {/* Car Marker */}
              <circle 
                ref={carDotRef}
                r="350"
                fill="#ef4444" 
                stroke="white" 
                strokeWidth="100"
                cx={data && data[activeIndex] ? data[activeIndex].X : 0}
                cy={data && data[activeIndex] ? data[activeIndex].Y : 0}
                style={{ filter: 'url(#glow)' }}
              />
            </svg>

          </div>
          </div>

      </div>
    </div>
  );
}

export default App;