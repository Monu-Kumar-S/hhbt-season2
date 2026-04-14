# 🏸 Hamilton Homes Badminton Tournament Season 2
## Complete Setup & Deployment Guide

---

## 📁 Project Structure

```
badminton-tournament/
├── index.html          ← ✅ STANDALONE APP (works immediately, no setup needed)
├── server.js           ← Node.js/Express backend (optional, for production)
├── package.json        ← Backend dependencies
├── .env.example        ← Environment variables template
├── README.md           ← This file
│
└── client/             ← (Optional) React frontend with backend integration
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── Dashboard.jsx
    │   │   ├── Teams.jsx
    │   │   ├── Groups.jsx
    │   │   ├── Matches.jsx
    │   │   ├── Knockout.jsx
    │   │   ├── Admin.jsx
    │   │   ├── LiveScoreboard.jsx
    │   │   └── TVMode.jsx
    │   ├── hooks/
    │   │   └── useSocket.js
    │   └── utils/
    │       ├── scoring.js
    │       └── standings.js
    └── public/
```

---

## 🚀 QUICKSTART (Standalone — No Installation Required)

The `index.html` file is a **fully self-contained app**. Just:

```bash
# Option 1: Double-click index.html in your file manager
# Option 2: Serve with any static server
npx serve .
# Then open http://localhost:3000
```

**All data is saved to browser localStorage automatically.** ✅

---

## 🔧 BACKEND SETUP (For Multi-Device / Production Use)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Step 1 — Install Dependencies

```bash
npm install
```

### Step 2 — Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

**.env contents:**
```
MONGO_URI=mongodb://localhost:27017/hhbt_s2
PORT=3001
NODE_ENV=development
```

### Step 3 — Start MongoDB (if local)

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Ubuntu/Debian
sudo systemctl start mongod

# Windows
net start MongoDB
```

### Step 4 — Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs at: **http://localhost:3001**

---

## 📦 PACKAGE.JSON

```json
{
  "name": "hamilton-homes-badminton",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "seed": "node seed.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "mongoose": "^7.5.0",
    "socket.io": "^4.7.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

---

## 🌱 SAMPLE DATA (seed.js)

```javascript
// seed.js — Run with: node seed.js
const mongoose = require('mongoose');
require('dotenv').config();

const teams = [
  { name: "Smash Bros", player1: "Arjun Kumar", player2: "Rohit Sharma", contact: "9876543210" },
  { name: "Net Ninjas", player1: "Priya Nair", player2: "Deepa Menon", contact: "9876543211" },
  { name: "Shuttle Kings", player1: "Vikram Singh", player2: "Anil Mehta", contact: "9876543212" },
  { name: "Court Crushers", player1: "Sunita Rao", player2: "Kavitha Iyer", contact: "9876543213" },
  { name: "Ace Attackers", player1: "Rajan Pillai", player2: "Suresh Nair", contact: "9876543214" },
  { name: "Drop Shot Kings", player1: "Meena Krishnan", player2: "Latha Suresh", contact: "9876543215" },
  { name: "Birdie Blasters", player1: "Kiran Reddy", player2: "Sanjay Gupta", contact: "9876543216" },
  { name: "Rally Rockets", player1: "Anitha Raj", player2: "Pooja Verma", contact: "9876543217" },
];

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hhbt_s2').then(async () => {
  const Team = mongoose.model('Team', new mongoose.Schema({
    name: String, player1: String, player2: String, contact: String, createdAt: { type: Date, default: Date.now }
  }));
  await Team.deleteMany({});
  await Team.insertMany(teams);
  console.log(`✅ Seeded ${teams.length} teams`);
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
```

---

## 🌐 DEPLOYMENT GUIDE

### Option A — Local Network (LAN Tournament)

Perfect for running at a venue where all devices are on the same WiFi:

```bash
# Find your local IP
# macOS/Linux:
ifconfig | grep "inet " | grep -v 127
# Windows:
ipconfig

# Start server binding to all interfaces
PORT=3001 node server.js

# All devices on the same WiFi can access via:
# http://192.168.x.x:3001
```

**TV/Display Setup:**
1. Connect laptop to TV via HDMI
2. Open `http://localhost:3001` → click 📺 TV Mode
3. Full screen with F11

### Option B — Cloud Deployment (Railway)

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
railway add mongodb
railway deploy
```

### Option C — Render.com

1. Push code to GitHub
2. Go to render.com → New Web Service
3. Connect repo, set:
   - Build: `npm install`
   - Start: `node server.js`
4. Add environment variable: `MONGO_URI` (from MongoDB Atlas)
5. Deploy → share URL with participants

### Option D — Firebase (Alternative to MongoDB)

Replace `server.js` with Firebase:

```javascript
// firebase-config.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  projectId: "hhbt-s2",
  databaseURL: "https://hhbt-s2-default-rtdb.firebaseio.com"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const rtdb = getDatabase(app); // for real-time scores
```

---

## 🏸 HOW TO RUN A TOURNAMENT

### Step 1 — Registration
1. Open app → **Teams** tab
2. Add all participating teams (Name, 2 Players, Contact)
3. Supports up to 50 teams
4. Export team list as CSV for records

### Step 2 — Configure & Start Groups
1. Go to **Admin** tab
2. Set number of groups (default: 4)
3. Set teams advancing per group (default: 2)
4. Click **▶ Start Group Stage**
5. Teams are auto-shuffled into groups, fixtures generated

### Step 3 — Play Group Matches
1. Go to **Matches** tab
2. Click **▶ Start** on any match
3. Click **📊 Scoring** to open live scoreboard
4. Tap **+1 Point** for the scoring team
5. Sets auto-complete at 21 (win by 2) or 30 (cap)
6. Match auto-completes after 2 sets won

### Step 4 — Monitor Standings
- **Groups** tab shows live standings with tie-breakers
- Green highlighted rows = qualifying positions
- Standings update in real-time after each match

### Step 5 — Knockout Stage
1. After all group matches, go to **Admin**
2. Click **⚔️ Advance to Knockout**
3. Top teams auto-advance based on standings
4. **Knockout** tab shows Semi-Finals and Final
5. Play same way as group matches

### Step 6 — TV Display
- Click **📺 TV** button anytime
- Shows live score, upcoming matches, group standings
- Perfect for projector/big screen display
- Clock updates every second

---

## 📊 SCORING RULES

| Rule | Value |
|------|-------|
| Points to win a set | 21 |
| Win-by margin | 2 |
| Maximum set score | 30 |
| Sets per match | Best of 3 |
| Sets to win match | 2 |

**Tiebreakers (Group Stage Ranking):**
1. Matches Won
2. Points Difference (For - Against)
3. Sets Won/Lost ratio
4. Head-to-head result

---

## 🎮 ADMIN FEATURES

| Feature | Location |
|---------|----------|
| Add/Edit/Delete Teams | Teams tab |
| Generate Groups | Admin → Start Group Stage |
| Start/Pause Match | Matches tab → Match card |
| Edit Score Manually | Matches tab → ✏️ button |
| Reset Match | Matches tab → ↺ button |
| Lock Results | Admin → Lock Results |
| Advance to Knockout | Admin → Advance to Knockout |
| Reset Entire Tournament | Admin → Reset All |
| Export Team List | Teams tab → Export CSV |

---

## 📱 MOBILE SUPPORT

The app is fully responsive:
- **Portrait phone**: Works for scoring and viewing
- **Landscape tablet**: Ideal for score entry at courtside
- **Desktop**: Full dashboard view
- **TV/Projector**: TV Mode optimized for large screens

---

## 💡 TIPS FOR LIVE TOURNAMENT

1. **Before the tournament**: Test on all devices, pre-register teams
2. **Assign roles**: 1 person per court for scoring, 1 admin
3. **TV mode**: Set up on a large screen visible to participants
4. **Backup**: Data auto-saves to localStorage; export CSV regularly
5. **Network**: Use a dedicated WiFi hotspot for reliability
6. **Browser**: Use Chrome or Firefox for best performance

---

## 🐛 TROUBLESHOOTING

**Data lost on refresh?**
→ Data is in localStorage. Don't clear browser data during tournament.

**Can't delete teams?**
→ Teams can only be deleted during Registration phase.

**Match scores wrong?**
→ Use ✏️ Edit Score to manually correct any set.

**TV mode not full screen?**
→ Press F11 in browser after opening TV mode.

---

## 📞 SUPPORT

Built for **Hamilton Homes Badminton Tournament Season 2**
For issues, use the ✏️ Edit Score feature to correct any mistakes.
All data persists in your browser — no internet required for standalone mode.
