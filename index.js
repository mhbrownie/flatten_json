const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

// Transform { label + value/values } into { label: value }
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
  return obj;
}

// Transform any array of answers using the same label logic
function transformAnswers(answers) {
  return answers.map(simplifyLabeledObject);
}

// Recursively transform the JSON structure
function transform(obj) {
  if (Array.isArray(obj)) {
    return obj.map(transform);
  }

  if (obj && typeof obj === 'object') {
    const result = {};

    // Special handling for Repeat
    if (obj.type === 'Repeat' && Array.isArray(obj.rows)) {
      result.type = obj.type;
      result.label = obj.label;
      result.name = obj.name;
      result.rows = obj.rows.map(row => {
        const newRow = { ...row };
        if (Array.isArray(newRow.pages)) {
          newRow.pages = newRow.pages.map(page => {
            const newPage = { ...page };
            if (Array.isArray(newPage.sections)) {
              newPage.sections = newPage.sections.map(section => {
                const newSection = { ...section };
                if (Array.isArray(newSection.answers)) {
                  newSection.answers = transformAnswers(newSection.answers);
                }
                return newSection;
              });
            }
            return newPage;
          });
        }
        return newRow;
      });
      return result;
    }

    // Handle labeled objects outside Repeat
    if ('label' in obj && ('value' in obj || 'values' in obj)) {
      return simplifyLabeledObject(obj);
    }

    // Recurse on regular objects
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
  res.send('✅ Structured JSON Transformer is running.');
});

app.listen(PORT, () => {
  console.log(`🚀 JSON Transformer listening on port ${PORT}`);
});
