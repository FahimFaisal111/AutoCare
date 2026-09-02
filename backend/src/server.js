/**
 * AutoCare AI - Express Server Entry Point
 * Architecture: Node.js + Express + Pure Raw SQL (mysql2/promise) -> MySQL Database
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const { testConnection, pool } = require('./config/db');
const routes = require('./routes');
const { errorHandler, NotFoundError } = require('./middleware/errorHandler');

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);

// 1. Core Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// 3. Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'autocare-backend', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'autocare-backend', timestamp: new Date().toISOString() });
});

// Readiness probe: confirms the process is up AND the MySQL pool can serve a query.
app.get('/api/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'READY', db: 'UP', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'NOT_READY', db: 'DOWN', error: error.message, timestamp: new Date().toISOString() });
  }
});

// 4. API Routes
app.use('/api', routes);

// 5. 404 Route Handler
app.use((req, res, next) => {
  next(new NotFoundError(`Endpoint not found: ${req.method} ${req.originalUrl}`));
});

// 6. Global Error Handling Middleware
app.use(errorHandler);

// 7. Server Initialization
async function startServer() {
  try {
    await testConnection().catch((err) => {
      console.warn('⚠️ [DB WARNING] MySQL is not reachable on localhost:3306. Backend will run in resilient mode:', err.message);
    });
  } catch (error) {
    console.warn('⚠️ [DB WARNING] Error during initial connection check:', error.message);
  }

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 AutoCare AI Backend running on http://localhost:${PORT}`);
    console.log(`📦 Architecture: Node.js / Express (Pure Raw SQL & MySQL)`);
    console.log(`=======================================================`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;
