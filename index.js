const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

function simplifyLabeledObject(obj) {
  if (typeof obj.label === 'string') {
    const label = obj.label;
    if ('value' in obj) return { [label]: obj.value || "" };
    if (Array.isArray(obj.values)) return { [label]: obj.values[0] || "" };
  }
  return null;
}

function extractSimplifiedAnswers(row) {
  const result = [];
  const pages = row.pages || [];
  for (const page of pages) {
    const sections = page.sections || [];
    for (const section of sections) {
      const answers = section.answers || [];
      for (const answer of answers) {
        const simplified = simplifyLabeledObject(answer);
        if (simplified) result.push(simplified);
      }
    }
  }
  return result;
}

function transform(obj) {
  if (Array.isArray(obj)) {
    return obj.map(transform);
  }

  if (obj && typeof obj === 'object') {
    // Special handling for Repeat blocks
    if (obj.type === 'Repeat' && Array.isArray(obj.rows)) {
      return {
        type: obj.type,
        label: obj.label,
        name: obj.name,
        rows: obj.rows.map(row => ({
          answers: extractSimplifiedAnswers(row)
        }))
      };
    }

    // Handle simple labeled objects
    if ('label' in obj && ('value' in obj || 'values' in obj)) {
      const simplified = simplifyLabeledObject(obj);
      if (simplified) return simplified;
    }

    // Recurse on regular objects
    const result = {};
    for (const key in obj) {
      result[key] = transform(obj[key]);
    }
    return result;
  }

  return obj;
}

app.post('/flatten', (req, res) => {
  try {
    const output = transform(req.body);
    res.json(output);
  } catch (e) {
    console.error('❌ Transform error:', e);
    res.status(500).json({ error: 'Failed to process input.' });
  }
});

app.get('/', (req, res) => {
  res.send('🧩 JSON Transformer API is running. POST to /flatten');
});

app.listen(PORT, () => {
  console.log(`🚀 Transformer API running on port ${PORT}`);
});
