const { clearSessionCookie } = require('./_auth');

module.exports = async (req, res) => {
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
};
