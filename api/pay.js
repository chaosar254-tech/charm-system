module.exports = async (req, res) => {
  const planAliases = {
    starter: 'starter',
    growth: 'growth',
    basic: 'starter',
    pro: 'growth',
  };

  req.query = req.query || {};

  if (req.query.planId && !req.query.plan) {
    req.query.plan = planAliases[String(req.query.planId).toLowerCase()] || req.query.planId;
  }

  return require('./subscribe')(req, res);
};
