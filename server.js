// ============================================================
// Hamilton Homes Badminton Tournament — Node.js/Express Backend
// ============================================================
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// ── MONGO CONNECTION ──────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hhbt_s2';
mongoose.connect(MONGO_URI).then(() => console.log('✅ MongoDB connected')).catch(console.error);

// ── SCHEMAS ───────────────────────────────────────────────────
const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  player1: { type: String, required: true },
  player2: { type: String, required: true },
  contact: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const SetSchema = new mongoose.Schema({
  s1: { type: Number, default: 0 },
  s2: { type: Number, default: 0 },
  completed: { type: Boolean, default: false }
});

const MatchSchema = new mongoose.Schema({
  team1Id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  team2Id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  round: String,
  status: { type: String, enum: ['upcoming', 'live', 'completed'], default: 'upcoming' },
  sets: { type: [SetSchema], default: [{ s1: 0, s2: 0, completed: false }] },
  currentSet: { type: Number, default: 0 },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  locked: { type: Boolean, default: false },
  startTime: Date,
  endTime: Date
});

const GroupSchema = new mongoose.Schema({
  name: String,
  teamIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }]
});

const TournamentSchema = new mongoose.Schema({
  name: { type: String, default: 'Hamilton Homes Badminton Tournament Season 2' },
  phase: { type: String, default: 'registration' },
  config: {
    numGroups: { type: Number, default: 4 },
    advancePerGroup: { type: Number, default: 2 }
  },
  champion: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null }
});

const Team = mongoose.model('Team', TeamSchema);
const Match = mongoose.model('Match', MatchSchema);
const Group = mongoose.model('Group', GroupSchema);
const Tournament = mongoose.model('Tournament', TournamentSchema);

// ── SOCKET.IO ─────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  socket.on('disconnect', () => console.log('🔌 Client disconnected:', socket.id));
});

const broadcast = (event, data) => io.emit(event, data);

// ── HELPERS ───────────────────────────────────────────────────
const getOrCreateTournament = async () => {
  let t = await Tournament.findOne();
  if (!t) { t = await Tournament.create({}); }
  return t;
};

const uid = () => require('crypto').randomUUID().slice(0, 8);

const generateRoundRobin = (teamIds) => {
  const pairs = [];
  for (let i = 0; i < teamIds.length; i++)
    for (let j = i + 1; j < teamIds.length; j++)
      pairs.push({ team1Id: teamIds[i], team2Id: teamIds[j] });
  return pairs;
};

// ── TEAM ROUTES ───────────────────────────────────────────────
app.get('/api/teams', async (req, res) => {
  try { res.json(await Team.find().sort({ createdAt: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/teams', async (req, res) => {
  try {
    const { name, player1, player2, contact } = req.body;
    const count = await Team.countDocuments();
    if (count >= 50) return res.status(400).json({ error: 'Maximum 50 teams allowed' });
    const existing = await Team.findOne({ $or: [{ player1 }, { player2 }, { player1: player2 }, { player2: player1 }] });
    if (existing) return res.status(400).json({ error: 'Player already registered' });
    const team = await Team.create({ name, player1, player2, contact });
    broadcast('team:added', team);
    res.status(201).json(team);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/teams/:id', async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
    broadcast('team:updated', team);
    res.json(team);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/teams/:id', async (req, res) => {
  try {
    const t = await Tournament.findOne();
    if (t && t.phase !== 'registration') return res.status(400).json({ error: 'Cannot remove teams after start' });
    await Team.findByIdAndDelete(req.params.id);
    broadcast('team:deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── MATCH ROUTES ──────────────────────────────────────────────
app.get('/api/matches', async (req, res) => {
  try {
    const { type } = req.query;
    const q = type === 'knockout' ? { groupId: null } : type === 'group' ? { groupId: { $ne: null } } : {};
    res.json(await Match.find(q).populate('team1Id team2Id winner'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/matches/:id/start', async (req, res) => {
  try {
    const m = await Match.findByIdAndUpdate(req.params.id, { status: 'live', startTime: new Date() }, { new: true });
    broadcast('match:started', m);
    res.json(m);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/matches/:id/point', async (req, res) => {
  try {
    const { team } = req.body; // 1 or 2
    const m = await Match.findById(req.params.id);
    if (!m || m.status !== 'live') return res.status(400).json({ error: 'Match not live' });
    const ci = m.currentSet;
    const set = m.sets[ci];
    if (team === 1) set.s1 = Math.min(30, set.s1 + 1);
    else set.s2 = Math.min(30, set.s2 + 1);
    if ((set.s1 >= 21 || set.s2 >= 21) && Math.abs(set.s1 - set.s2) >= 2) set.completed = true;
    else if (set.s1 >= 30 || set.s2 >= 30) set.completed = true;
    m.sets[ci] = set;
    const sw1 = m.sets.filter(s => s.s1 > s.s2 && s.completed).length;
    const sw2 = m.sets.filter(s => s.s2 > s.s1 && s.completed).length;
    if (sw1 >= 2) { m.winner = m.team1Id; m.status = 'completed'; m.endTime = new Date(); }
    else if (sw2 >= 2) { m.winner = m.team2Id; m.status = 'completed'; m.endTime = new Date(); }
    else if (set.completed && ci < 2) { m.currentSet = ci + 1; m.sets.push({ s1: 0, s2: 0, completed: false }); }
    await m.save();
    broadcast('match:updated', m);
    res.json(m);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/matches/:id/score', async (req, res) => {
  try {
    const { sets } = req.body;
    const m = await Match.findByIdAndUpdate(req.params.id, { sets }, { new: true });
    broadcast('match:updated', m);
    res.json(m);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/matches/:id/reset', async (req, res) => {
  try {
    const m = await Match.findByIdAndUpdate(req.params.id,
      { status: 'upcoming', sets: [{ s1: 0, s2: 0, completed: false }], currentSet: 0, winner: null, startTime: null },
      { new: true });
    broadcast('match:reset', m);
    res.json(m);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── TOURNAMENT ROUTES ─────────────────────────────────────────
app.get('/api/tournament', async (req, res) => {
  try { res.json(await getOrCreateTournament()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tournament/start-groups', async (req, res) => {
  try {
    const { numGroups = 4, advancePerGroup = 2 } = req.body;
    const teams = await Team.find();
    if (teams.length < 4) return res.status(400).json({ error: 'Need at least 4 teams' });
    await Group.deleteMany({});
    await Match.deleteMany({ groupId: { $ne: null } });
    const shuffled = teams.sort(() => Math.random() - 0.5);
    const n = Math.min(numGroups, Math.floor(teams.length / 2));
    const groups = [], matches = [];
    for (let i = 0; i < n; i++) {
      const start = Math.floor((i / n) * shuffled.length);
      const end = Math.floor(((i + 1) / n) * shuffled.length);
      const groupTeams = shuffled.slice(start, end);
      const group = await Group.create({ name: String.fromCharCode(65 + i), teamIds: groupTeams.map(t => t._id) });
      groups.push(group);
      for (const pair of generateRoundRobin(groupTeams.map(t => t._id))) {
        const m = await Match.create({ ...pair, groupId: group._id, round: `Group ${group.name}` });
        matches.push(m);
      }
    }
    const t = await Tournament.findOneAndUpdate({}, { phase: 'group', config: { numGroups: n, advancePerGroup } }, { new: true });
    broadcast('tournament:updated', { phase: 'group', groups, matches });
    res.json({ success: true, groups, matchCount: matches.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tournament/advance-knockout', async (req, res) => {
  try {
    const t = await getOrCreateTournament();
    const groups = await Group.find().populate('teamIds');
    const qualifiers = [];
    for (const g of groups) {
      const matches = await Match.find({ groupId: g._id, status: 'completed' });
      const stats = {};
      g.teamIds.forEach(team => { stats[team._id] = { teamId: team._id, won: 0, pd: 0 }; });
      matches.forEach(m => {
        const sw1 = m.sets.filter(s => s.s1 > s.s2 && s.completed).length;
        const sw2 = m.sets.filter(s => s.s2 > s.s1 && s.completed).length;
        const pf1 = m.sets.reduce((a,s) => a+s.s1, 0), pa1 = m.sets.reduce((a,s) => a+s.s2, 0);
        if (stats[m.team1Id]) { if (m.winner?.equals(m.team1Id)) stats[m.team1Id].won++; stats[m.team1Id].pd += pf1 - pa1; }
        if (stats[m.team2Id]) { if (m.winner?.equals(m.team2Id)) stats[m.team2Id].won++; stats[m.team2Id].pd += pa1 - pf1; }
      });
      const sorted = Object.values(stats).sort((a,b) => b.won-a.won || b.pd-a.pd);
      qualifiers.push(...sorted.slice(0, t.config.advancePerGroup).map(s => s.teamId));
    }
    await Match.deleteMany({ groupId: null });
    const km = [];
    for (let i = 0; i < Math.floor(qualifiers.length / 2); i++) {
      const m = await Match.create({ team1Id: qualifiers[i*2], team2Id: qualifiers[i*2+1], round: 'Semi-Final' });
      km.push(m);
    }
    const final = await Match.create({ round: 'Final' });
    km.push(final);
    await Tournament.findOneAndUpdate({}, { phase: 'knockout' });
    broadcast('tournament:updated', { phase: 'knockout', knockoutMatches: km });
    res.json({ qualifiers: qualifiers.length, semifinalCount: km.length - 1 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GROUPS ────────────────────────────────────────────────────
app.get('/api/groups', async (req, res) => {
  try { res.json(await Group.find().populate('teamIds')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CATCH-ALL ─────────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'client/build', 'index.html')));

// ── START ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
