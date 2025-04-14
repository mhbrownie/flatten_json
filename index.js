const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

// Simplifies: { label + value/values } → { "Label": "Value" }
function simplifyLabeledObject(obj) {
  if (typeof obj.label === 'string') {
    const key = obj.label;
    if ('value' in obj) return { [key]: obj.value || "" };
    if (Array.isArray(obj.values)) return { [key]: obj.values[0] || "" };
  }
  return null;
}

// Extract and simplify answers from deeply nested structure
function extractSimplifiedAnswers(row) {
  const simplified = [];
  const pages = row.pages || [];
  for (const page of pages) {
    const sections = page.sections || [];
    for (const section of sections) {
      const answers = section.answers || [];
      for (const answer of answers) {
        const simplifiedEntry = simplifyLabeledObject(answer);
        if (simplifiedEntry) {
          simplified.push(simplifiedEntry);
        }
      }
    }
  }
  return simplified;
}

// Recursively transforms the entire object
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
        rows: obj.rows.map(row => {
          return {
            answers: extractSimplifiedAnswers(row)
          };
        })
      };
    }

    // Simplify single labeled objects outside Repeat
    if ('label' in obj && ('value' in obj || 'values' in obj)) {
      const simplified = simplifyLabeledObject(obj);
      if (simplified) return simplified;
    }

    // Recurse normally
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
  res.send('🧩 JSON Transformer is running.');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
