const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

function simplifyLabeledObject(obj) {
  if (typeof obj.label === 'string') {
    const label = obj.label;
    if ('value' in obj) {
      return { [label]: obj.value || "" };
    }
    if (Array.isArray(obj.values)) {
      return { [label]: obj.values[0] || "" };
    }
  }
  return obj;
}

function extractAnswersFromRepeat(rows) {
  const simplified = [];
  for (const row of rows) {
    const pages = row.pages || [];
    for (const page of pages) {
      const sections = page.sections || [];
      for (const section of sections) {
        const answers = section.answers || [];
        for (const ans of answers) {
          const key = Object.keys(ans)[0];
          simplified.push({ [key]: ans[key] || "" });
        }
      }
    }
  }
  return simplified;
}

function transform(obj) {
  if (Array.isArray(obj)) {
    return obj.map(transform);
  }

  if (typeof obj === 'object' && obj !== null) {
    // Handle labeled element with value(s)
    if (typeof obj.label === 'string' && ('value' in obj || 'values' in obj)) {
      return simplifyLabeledObject(obj);
    }

    // Handle Repeat type with rows
    if (obj.type === 'Repeat' && Array.isArray(obj.rows)) {
      return extractAnswersFromRepeat(obj.rows);
    }

    // Otherwise recurse
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
    const result = transform(req.body);
    res.json(result);
  } catch (e) {
    console.error("Error:", e);
    res.status(400).json({ error: 'Invalid JSON or processing failed.' });
  }
});

app.get('/', (req, res) => {
  res.send('Complex JSON transformer running.');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
