const jwt = require('jsonwebtoken');
require('dotenv').config();

function auth(req, res, next) {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json("Access denied. No token provided.");

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json("Invalid token");
  }
}

module.exports = auth;
