const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

function extractLabels(obj, result = {}) {
  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractLabels(item, result);
    }
  } else if (typeof obj === 'object' && obj !== null) {
    if (
      typeof obj.label === 'string' &&
      Array.isArray(obj.values) &&
      obj.values.length > 0
    ) {
      result[obj.label] = obj.values[0]; // or join(', ') for all
    }
    for (const key in obj) {
      extractLabels(obj[key], result);
    }
  }
  return result;
}

app.post('/flatten', (req, res) => {
  try {
    const simplified = extractLabels(req.body);
    res.json(simplified);
  } catch (e) {
    res.status(400).json({ error: 'Invalid JSON or structure' });
  }
});

app.get('/', (req, res) => {
  res.send('JSON Flattener is running!');
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
