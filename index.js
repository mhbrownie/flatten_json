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

function extractNamedRows(data) {
  const output = {};

  function recurse(obj, pageLabel = "", sectionLabel = "") {
    if (Array.isArray(obj)) {
      obj.forEach(item => recurse(item, pageLabel, sectionLabel));
    } else if (obj && typeof obj === 'object') {
      if (Array.isArray(obj.rows)) {
        const name = [pageLabel, sectionLabel].filter(Boolean).join(".");
        output[name] = output[name] || [];
        obj.rows.forEach(row => output[name].push(simplifyJson(row)));
      }
      for (const [k, v] of Object.entries(obj)) {
        const nextPage = obj.label && !pageLabel ? obj.label : pageLabel;
        const nextSection = k === "sections" && obj.label ? obj.label : sectionLabel;
        recurse(v, nextPage, nextSection);
      }
    }
  }

  recurse(data);
  return output;
}

app.post('/transform', (req, res) => {
  try {
    const input = req.body;
    const result = Array.isArray(input) ? input.map(entry => {
      const simplified = simplifyJson(entry);
      simplified.rowGroups = extractNamedRows(entry);
      return simplified;
    }) : {
      ...simplifyJson(input),
      rowGroups: extractNamedRows(input)
    };
    res.json(result);
  } catch (e) {
    console.error('❌ Error:', e);
    res.status(500).json({ error: 'Invalid input or internal error.' });
  }
});

app.get('/', (req, res) => {
  res.send('🧩 POST JSON to /transform to flatten and structure it for Make.com');
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Service running...');
});
