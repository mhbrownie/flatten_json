const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

function transformLabeledObject(obj) {
  if (typeof obj.label === 'string') {
    if ('value' in obj) {
      return { [obj.label]: obj.value || "" };
    }
    if (Array.isArray(obj.values)) {
      return { [obj.label]: obj.values[0] || "" };
    }
  }
  return obj;
}

function transformAnswers(answers) {
  return answers.map(ans => transformLabeledObject(ans));
}

function transform(obj) {
  if (Array.isArray(obj)) {
    return obj.map(transform);
  }

  if (obj && typeof obj === 'object') {
    // Handle Repeat blocks by flattening their answers
    if (obj.type === 'Repeat' && Array.isArray(obj.rows)) {
      const flattened = [];
      for (const row of obj.rows) {
        const pages = row.pages || [];
        for (const page of pages) {
          const sections = page.sections || [];
          for (const section of sections) {
            const answers = section.answers || [];
            const simplified = transformAnswers(answers);
            flattened.push(...simplified);
          }
        }
      }
      return flattened;
    }

    // Handle label/value(s) objects directly
    if ('label' in obj && ('value' in obj || 'values' in obj)) {
      return transformLabeledObject(obj);
    }

    // Recurse through all children
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
  res.send('🧩 JSON Transformer running.');
});

app.listen(PORT, () => {
  console.log(`✅ Transformer listening on port ${PORT}`);
});
