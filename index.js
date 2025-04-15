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
      const nextPage = obj.label && k === 'pages' ? obj.label : pageLabel
