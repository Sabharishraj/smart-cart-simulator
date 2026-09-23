const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PRODUCTS = {
'rice': { name: 'Basmati Rice 1kg', price: 120, weight: 1000 },
'tea': { name: 'Tata Tea 250g', price: 95, weight: 250 },
'biscuits': { name: 'Parle-G Biscuits', price: 30, weight: 100 },
'charger': { name: 'iPhone Charger', price: 899, weight: 50 },
'brick': { name: 'Heavy Brick (Fraud)', price: 10, weight: 2000 }
};

let cart = { items: [], total: 0, weight: 0, locked: false, sensorHistory: [] };

function processItem(id, isFraud = false) {
if (cart.locked) return;
const p = PRODUCTS[id];
if (!p) return;

const confidence = Math.random() > 0.1 ? (0.88 + Math.random() * 0.11) : (0.60 + Math.random() * 0.20);
const noise = (Math.random() - 0.5) * 4;
let actualWeight = p.weight + noise;
if (isFraud) actualWeight = PRODUCTS['brick'].weight + noise;

cart.sensorHistory.push({
time: new Date().toLocaleTimeString(),
vision: parseFloat((confidence * 100).toFixed(1)),
weight: parseFloat(actualWeight.toFixed(1))
});
if (cart.sensorHistory.length > 20) cart.sensorHistory.shift();

if (isFraud || Math.abs(actualWeight - p.weight) > 15) {
cart.locked = true;
io.emit('alert', { type: 'CRITICAL', msg: `FRAUD: Weight Mismatch! Expected ~${p.weight}g, Got ${actualWeight.toFixed(0)}g` });
io.emit('update', cart);
} else if (confidence < 0.85) {
io.emit('fail', { msg: `Vision Uncertain (${(confidence*100).toFixed(0)}%). Re-scan.` });
} else {
cart.items.push(p);
cart.total += p.price;
cart.weight += actualWeight;
io.emit('item_added', { name: p.name, conf: confidence, wt: actualWeight });
io.emit('update', cart);
}
}

io.on('connection', (socket) => {
console.log('📱 Phone connected via Local HTTP WebSockets');
socket.emit('update', cart);
socket.on('scan_item', (data) => {
console.log(`🛒 Scan Received: ${data.id} | Fraud: ${data.fraud}`);
processItem(data.id, data.fraud);
});
socket.on('unscanned_drop', () => {
if (cart.locked) return;
cart.locked = true;
cart.weight += 500;
io.emit('alert', { type: 'WARNING', msg: 'UNSCANNED DROP DETECTED! Cart Locked.' });
io.emit('update', cart);
});
});

server.listen(3001, () => console.log('🛒 ESP32 Simulator running on port 3001'));
