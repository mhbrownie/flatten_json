const express = require('express');
const app = express();
app.use(express.json({ limit: '20mb' }));

function simplifyAnswers(answers) {
  const simplified = {};
  for (const answer of answers) {
    if (answer && typeof answer === 'object') {
      const label = answer.label || '';
      if (!label) continue;
      let value = '';
      if ('value' in answer) {
        value = answer.value || '';
      } else if (Array.isArray(answer.values) && answer.values.length > 0) {
        value = answer.values[0];
      }
      simplified[label] = value;
    }
  }
  return simplified;
}

function transformGroupedByLabel(data) {
  const output = [];

  for (const record of data) {
    const grouped = {};

    function processNode(node, context = '') {
      if (Array.isArray(node)) {
        for (const item of node) {
          processNode(item, context);
        }
      } else if (node && typeof node === 'object') {
        const currentLabel = node.label || context;

        if (Array.isArray(node.answers)) {
          const simplified = simplifyAnswers(node.answers);
          if (!grouped[currentLabel]) grouped[currentLabel] = [];
          grouped[currentLabel].push(simplified);
        }

        if (Array.isArray(node.rows)) {
          for (const row of node.rows) {
            const pages = row.pages || [];
            for (const page of pages) {
              const pageLabel = page.label || 'UnnamedPage';
              const sections = page.sections || [];
              for (const section of sections) {
                const sectionLabel = section.label || 'UnnamedSection';
                const key = `${pageLabel}.${sectionLabel}`;
                const simplified = simplifyAnswers(section.answers || []);
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(simplified);
              }
            }
          }
        }

        for (const val of Object.values(node)) {
          processNode(val, currentLabel);
        }
      }
    }

    processNode(record);
    output.push(grouped);
  }

  return output;
}

app.post('/transform', (req, res) => {
  try {
    const input = req.body;
    const data = Array.isArray(input) ? input : [input];
    const result = transformGroupedByLabel(data);
    res.json(result);
  } catch (e) {
    console.error('❌ Error during transformation:', e);
    res.status(500).json({ error: 'Transformation failed.' });
  }
});

app.get('/', (req, res) => {
  res.send('✅ POST your JSON to /transform to simplify it for Make.com');
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 JSON Transformer API running...');
});
