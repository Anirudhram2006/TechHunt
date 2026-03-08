const jwt = require('jsonwebtoken');

function unauthorized(res) {
  return res.status(403).send('Unauthorized Access');
}

function verifyAdmin(req, res, next) {
  const token = req.cookies.admin_token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return unauthorized(res);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return unauthorized(res);
    }
    req.admin = decoded;
    return next();
  } catch (error) {
    return unauthorized(res);
  }
}

function verifyParticipant(req, res, next) {
  const token = req.cookies.participant_token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return unauthorized(res);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'participant') {
      return unauthorized(res);
    }
    req.participant = decoded;
    return next();
  } catch (error) {
    return unauthorized(res);
  }
}

module.exports = { verifyAdmin, verifyParticipant, unauthorized };
