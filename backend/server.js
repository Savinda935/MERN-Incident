// server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const incidentRoutes = require('./routes/incidentRoutes');
const VcAmRoutes = require('./routes/Vc,AmRoutes');
const authRoutes = require("./routes/authRoutes");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


// Root route (to check if backend is working)
app.get('/', (req, res) => {
  res.send('Backend deployed and working ✅');
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Use routes
app.use('/api/incidents', incidentRoutes);
app.use('/api/vc_am', VcAmRoutes);
app.use("/auth", authRoutes);

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
