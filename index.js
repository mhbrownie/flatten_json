const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

function simplifyLabeledObject(obj) {
  if (typeof obj.label === 'string') {
    const key = obj.label;
    if ('value' in obj) {
      return { [key]: obj.value || "" };
    }
    if (Array.isArray(obj.values)) {
      return { [key]: obj.values[0] || "" };
    }
  }
  return null;
}

function extractAnswersFromRepeat(rows) {
  const flattened = [];
  for (const row of rows) {
    const pages = row.pages || [];
    for (const page of pages) {
      const sections = page.sections || [];
      for (const section of sections) {
        const answers = section.answers || [];
        for (const answer of answers) {
          const simplified = simplifyLabeledObject(answer);
          if (simplified) {
            flattened.push(simplified);
          }
        }
      }
    }
  }
  return flattened;
}

function transform(obj) {
  if (Array.isArray(obj)) {
    return obj.map(transform);
  }

  if (obj && typeof obj === 'object') {
    // Handle Repeat blocks
    if (obj.type === 'Repeat' && Array.isArray(obj.rows)) {
      return extractAnswersFromRepeat(obj.rows);
    }

    // Handle objects with label/value or label/values directly
    if ('label' in obj && ('value' in obj || 'values' in obj)) {
      const simplified = simplifyLabeledObject(obj);
      if (simplified) return simplified;
    }

    // Recurse into children
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
    console.error('Transform error:', e);
    res.status(500).json({ error: 'Failed to process input.' });
  }
});

app.get('/', (req, res) => {
  res.send('✅ JSON Transformer ready.');
});

app.listen(PORT, () => {
  console.log(`🚀 Listening on port ${PORT}`);
});
