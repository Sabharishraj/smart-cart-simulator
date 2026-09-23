import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldAlert, ShoppingCart, Wifi, AlertTriangle } from 'lucide-react';
import './App.css';

const socket = io('http://localhost:3001');

function App() {
  const [cart, setCart] = useState({ items: [], total: 0, weight: 0, locked: false, sensorHistory: [] });
  const [alert, setAlert] = useState(null);
  const [lastMsg, setLastMsg] = useState('System Ready');

  useEffect(() => {
    socket.on('update', (data) => setCart(data));
    socket.on('alert', (a) => { setAlert(a); setLastMsg(`️ ${a.msg}`); });
    socket.on('item_added', (d) => setLastMsg(`✅ Added ${d.name} (${d.wt.toFixed(0)}g)`));
    socket.on('fail', (f) => setLastMsg(` ${f.msg}`));
    return () => socket.off();
  }, []);

  const scanManual = (id, fraud = false) => socket.emit('scan_item', { id, fraud });

  return (
    <div className="dashboard">
      <header>
        <h1>Edge-AI Smart Cart <span className="badge">SIMULATION</span></h1>
        <div className="status"><Wifi size={16}/> ESP32-S3 Connected | <ShieldAlert size={16}/> Dual-Modal Active</div>
      </header>
      <div className="grid">
        <div className="panel">
          <h2>Dual-Modal Engine Live Feed</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={cart.sensorHistory}>
                <XAxis dataKey="time" stroke="#666" fontSize={10} />
                <YAxis yAxisId="left" stroke="#3b82f6" label={{value:'Weight(g)', angle:-90, position:'insideLeft'}} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" label={{value:'Confidence(%)', angle:90, position:'insideRight'}} />
                <Tooltip contentStyle={{background:'#1e293b', border:'none', borderRadius:'8px'}} />
                <Line yAxisId="left" type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} dot={false} name="Load Cell" />
                <Line yAxisId="right" type="monotone" dataKey="vision" stroke="#10b981" strokeWidth={2} dot={false} name="TinyML Vision" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="controls">
            <h3>Physical Actions</h3>
            <div className="btn-grid">
              <button onClick={() => scanManual('rice')}>Scan Rice 1kg</button>
              <button onClick={() => scanManual('tea')}>Scan Tea 250g</button>
              <button onClick={() => scanManual('biscuits')}>Scan Biscuits</button>
              <button onClick={() => scanManual('charger', true)} className="fraud-btn"><AlertTriangle size={14}/> Simulate Weight Swap Fraud</button>
              <button onClick={() => socket.emit('unscanned_drop')} className="warn-btn">Simulate Unscanned Drop</button>
            </div>
            <div className="log">{lastMsg}</div>
          </div>
        </div>
        <div className={`panel bill-panel ${cart.locked ? 'locked' : ''}`}>
          <div className="bill-header"><ShoppingCart /> <h2>Live Bill</h2></div>
          {alert && <div className="alert-box">{alert.msg}</div>}
          <div className="items-list">
            {cart.items.map((item, i) => (
              <div key={i} className="item-row"><span>{item.name}</span><span>₹{item.price}</span></div>
            ))}
            {cart.items.length === 0 && <p className="empty">Cart Empty. Scan items above.</p>}
          </div>
          <div className="totals">
            <div>Total Items: {cart.items.length}</div>
            <div>Net Weight: {cart.weight.toFixed(1)}g</div>
            <div className="grand-total">₹{cart.total}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default App;
