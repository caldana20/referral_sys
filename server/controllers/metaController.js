const geo = require('../config/geo.json');

exports.listCountries = (_req, res) => {
  res.json(geo.countries || []);
};

exports.listStates = (req, res) => {
  const { countryCode } = req.params;
  if (!countryCode) return res.status(400).json({ message: 'countryCode is required' });
  const states = geo.states?.[countryCode.toUpperCase()] || [];
  res.json(states);
};

