const { getSessionUser } = require('./_auth');

module.exports = async (req, res) => {
  const u = await getSessionUser(req);
  if (!u) return res.status(401).json({ error: 'Unauthorized' });
  return res.status(200).json({ email: u.email, role: u.role, name: u.name || '' });
};
