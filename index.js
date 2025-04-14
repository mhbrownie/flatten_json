const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

function simplifyLabelObject(obj) {
  if (typeof obj.label === 'string') {
    if (Array.isArray(obj.values)) {
      return { [obj.label]: obj.values[0] || "" };
    }
    if ('value' in obj) {
      return { [obj.label]: obj.value };
    }
  }
  return obj;
}

function simplifyAnswerEntry(entry) {
  const key = Object.keys(entry)[0];
  return { [key]: entry[key] };
}

function collapseRepeatRows(rows) {
  const collapsed = [];
  for (const row of rows) {
    const pages = row.pages || [];
    for (const page of pages) {
      const sections = page.sections || [];
      for (const section of sections) {
        const answers = section.answers || [];
        if (Array.isArray(answers)) {
          for (const entry of answers) {
            collapsed.push(simplifyAnswerEntry(entry));
          }
        }
      }
    }
  }
  return collapsed;
}

function transform(obj, labelTrail = []) {
  if (Array.isArray(obj)) {
    return obj.map(item => transform(item, labelTrail));
  }

  if (typeof obj === 'object' && obj !== null) {
    const currentLabel = obj.label || null;
    const newTrail = currentLabel ? [...labelTrail, currentLabel] : [...labelTrail];

    // 🎯 Handle Repeat sections by collapsing deeply
    if (obj.type === 'Repeat' && Array.isArray(obj.rows)) {
      return collapseRepeatRows(obj.rows);
    }

    // 🎯 Simplify any label+value(s) object
    if (typeof obj.label === 'string' && (Array.isArray(obj.values) || 'value' in obj)) {
      return simplifyLabelObject(obj);
    }

    const result = {};
    for (const key in obj) {
      result[key] = transform(obj[key], newTrail);
    }
    return result;
  }

  return obj;
}

app.post('/flatten', (req, res) => {
  try {
    const simplified = transform(req.body);
    res.json(simplified);
  } catch (e) {
    res.status(400).json({ error: 'Invalid JSON or structure', detail: e.message });
  }
});

app.get('/', (req, res) => {
  res.send('JSON Structure Flattener API is running.');
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
