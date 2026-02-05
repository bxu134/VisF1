import { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot, ReferenceLine} from 'recharts';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(null);
  const [corners, setCorners] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8000/api/race-data?d1=ver')
      .then(res => {
        setData(res.data.driver1.data);
        setCorners(res.data.circuit_info.corners);
        setLoading(false);
      })
      .catch(err => console.error(err));
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
      <div className="mb-4 flex justify-between items-center           bg-green-100">
        <h1 className="text-3xl font-bold text-gray-800">VisF1 Dashboard</h1>
        <div className="bg-gray-200 px-3 py-1 rounded text-sm font-mono">Abu Dhabi 2025 - VER</div>
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