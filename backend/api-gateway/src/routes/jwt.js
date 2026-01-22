const express = require('express');
const router = express.Router();

// JWT routes placeholder
router.get('/verify', (req, res) => {
  res.json({ message: 'JWT verification endpoint' });
});

module.exports = router;