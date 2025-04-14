const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Accept large JSON payloads
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

function transform(obj, path = []) {
  if (Array.isArray(obj)) {
    return obj.map(item => transform(item, path));
  }

  if (typeof obj === 'object' && obj !== null) {
    const currentPath = [...path];

    // 🎯 Special collapse for GearDetails > Item Details > Item Details 1
    if (
      currentPath.join('.') === 'GearDetails.Item Details' &&
      'Item Details 1' in obj &&
      Array.isArray(obj['Item Details 1'])
    ) {
      return obj['Item Details 1'].map(item => simplifyLabelObject(item));
    }

    // Handle label/value(s) objects
    if (typeof obj.label === 'string' && (Array.isArray(obj.values) || 'value' in obj)) {
      return simplifyLabelObject(obj);
    }

    const transformed = {};
    for (const key in obj) {
      transformed[key] = transform(obj[key], [...currentPath, key]);
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
