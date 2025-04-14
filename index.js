const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Accept large JSON payloads
app.use(express.json({ limit: '10mb' }));

function transform(obj) {
  if (Array.isArray(obj)) {
    return obj.map(transform);
  }

  if (typeof obj === 'object' && obj !== null) {
    if (typeof obj.label === 'string') {
      if (Array.isArray(obj.values)) {
        return { [obj.label]: obj.values[0] || "" }; // always transform
      }
      if ('value' in obj) {
        return { [obj.label]: obj.value };
      }
    }

    const transformed = {};
    for (const key in obj) {
      transformed[key] = transform(obj[key]);
    }
    return transformed;
  }

  return obj;
}


app.post('/flatten', (req, res) => {
  try {
    const simplified = transform(req.body);
    res.json(simplified);
  } catch (e) {
    res.status(400).json({ error: 'Invalid JSON or structure' });
  }
});

app.get('/', (req, res) => {
  res.send('Label flattener service running.');
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
