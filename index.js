const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

function simplify(obj) {
  if (Array.isArray(obj)) {
    return obj.map(simplify);
  }

  if (obj && typeof obj === 'object') {
    if ('label' in obj && ('value' in obj || 'values' in obj)) {
      const key = obj.label;
      const val = 'value' in obj
        ? obj.value || ''
        : Array.isArray(obj.values) && obj.values.length > 0
        ? obj.values[0]
        : '';
      return { [key]: val };
    }

    const result = {};
    for (const key in obj) {
      result[key] = simplify(obj[key]);
    }
    return result;
  }

  return obj;
}

app.post('/simplify', (req, res) => {
  try {
    const simplified = simplify(req.body);
    res.json(simplified);
  } catch (e) {
    console.error('❌ Error simplifying JSON:', e);
    res.status(500).json({ error: 'Failed to simplify input JSON' });
  }
});

app.get('/', (req, res) => {
  res.send('🧪 POST your JSON to /simplify to get a simplified version.');
});

app.listen(PORT, () => {
  console.log(`🚀 JSON Simplifier running on http://localhost:${PORT}`);
});
