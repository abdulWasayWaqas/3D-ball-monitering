require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 3000;

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL Database.');
});

// Middleware
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
        "script-src": ["'self'", "https://cdn.jsdelivr.net"]
    }
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Save Position with improved error handling
app.post('/savePosition', (req, res) => {
    const { x, y, z } = req.body;
    const query = 'INSERT INTO positions (x, y, z) VALUES (?, ?, ?)';
    db.query(query, [x, y, z], (err, result) => {
        if (err) {
            console.error('Error saving position:', err);
            return res.status(500).send('Error saving position.');
        }
        io.emit('positionUpdate', { x, y, z });
        res.send('Position saved.');
    });
});

// Fetch Positions
app.get('/getPositions', (req, res) => {
    const query = 'SELECT * FROM positions ORDER BY timestamp DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching positions:', err);
            return res.status(500).send('Error fetching positions.');
        }
        res.json(results);
    });
});

// Clear Dashboard
app.delete('/clearDashboard', (req, res) => {
    const query = 'DELETE FROM positions';
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error clearing dashboard:', err);
            return res.status(500).send('Error clearing dashboard.');
        }
        io.emit('dashboardCleared');
        res.send('Dashboard cleared.');
    });
});

// Delete Entry
app.post('/deleteEntry', (req, res) => {
    const { id } = req.body;
    const query = 'DELETE FROM positions WHERE id = ?';
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error deleting entry:', err);
            return res.status(500).send('Error deleting entry.');
        }
        io.emit('entryDeleted', id);
        res.send('Entry deleted.');
    });
});

// Clear All Entries
app.delete('/clearAllEntries', (req, res) => {
    const query = 'TRUNCATE TABLE positions';
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error clearing all entries:', err);
            return res.status(500).send('Error clearing all entries.');
        }
        io.emit('allEntriesCleared');
        res.send('All entries cleared.');
    });
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected.');

    socket.on('disconnect', () => {
        console.log('User disconnected.');
    });
});

// Start the server
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
