const express = require('express');
const app = express();
app.use(express.json({ limit: '20mb' }));

function simplifyElement(el) {
  if (el && typeof el === 'object' && el.label) {
    if ('value' in el) return { [el.label]: el.value || "" };
    if (Array.isArray(el.values)) return { [el.label]: el.values[0] || "" };
  }
  return null;
}

function simplifyJson(obj) {
  if (Array.isArray(obj)) return obj.map(simplifyJson);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      const simplified = simplifyElement(v);
      if (simplified) Object.assign(result, simplified);
      else result[k] = simplifyJson(v);
    }
    return result;
  }
  return obj;
}

function extractNamedRows(obj, pageLabel = '', sectionLabel = '', output = {}) {
  if (Array.isArray(obj)) {
    obj.forEach(item => extractNamedRows(item, pageLabel, sectionLabel, output));
  } else if (obj && typeof obj === 'object') {
    if (Array.isArray(obj.rows)) {
      const key = `${pageLabel}.${sectionLabel}`.replace(/^\./, '');
      output[key] = output[key] || [];
      obj.rows.forEach(row => output[key].push(simplifyJson(row)));
    }
    for (const [k, v] of Object.entries(obj)) {
      const nextPage = obj.label && k === 'pages' ? obj.label : pageLabel;
      const nextSection = obj.label && k === 'sections' ? obj.label : sectionLabel;
      extractNamedRows(v, nextPage, nextSection, output);
    }
  }
  return output;
}

app.post('/transform', (req, res) => {
  try {
    const input = req.body;
    const result = Array.isArray(input)
      ? input.map(entry => ({
          ...simplifyJson(entry),
          rowGroups: extractNamedRows(entry)
        }))
      : {
          ...simplifyJson(input),
          rowGroups: extractNamedRows(input)
        };
    res.json(result);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Invalid input' });
  }
});

app.get('/', (req, res) => {
  res.send('✅ POST your TrueContext JSON to /transform');
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Transformer service running...');
});
