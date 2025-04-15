// Railway-deployable JSON transformation service using Express (Node.js)
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: "20mb" }));


function simplifyAnswers(answers) {
  const simplified = {};
  for (const ans of answers) {
    const label = ans.label;
    let value = "";
    if ("value" in ans) {
      value = ans.value;
    } else if (Array.isArray(ans.values) && ans.values.length > 0) {
      if (typeof ans.values[0] === "object") {
        value = ans.values[0].value || "";
      } else {
        value = ans.values[0];
      }
    }
    simplified[label] = value;
  }
  return simplified;
}

function buildHierarchy(node, hierarchy = [], result = {}) {
  if (typeof node === "object" && !Array.isArray(node)) {
    const label = node.label;
    if (label) hierarchy = [...hierarchy, label];

    const fqLabel = hierarchy.join(" > ");

    if (node.answers) {
      let curr = result;
      for (const level of hierarchy.slice(0, -1)) {
        curr = curr[level] = curr[level] || {};
      }
      const target = curr[fqLabel] = curr[fqLabel] || {};
      target._answers = target._answers || [];
      target._answers.push(simplifyAnswers(node.answers));
    }

    if (Array.isArray(node.rows)) {
      let curr = result;
      for (const level of hierarchy.slice(0, -1)) {
        curr = curr[level] = curr[level] || {};
      }
      const target = curr[fqLabel] = curr[fqLabel] || {};
      target._rows = target._rows || [];
      for (const row of node.rows) {
        const rowObj = {};
        buildHierarchy(row, [], rowObj);
        target._rows.push(rowObj);
      }
    } else {
      for (const key in node) {
        if (key !== "rows" && typeof node[key] === "object") {
          buildHierarchy(node[key], hierarchy, result);
        }
      }
    }
  } else if (Array.isArray(node)) {
    for (const item of node) {
      buildHierarchy(item, hierarchy, result);
    }
  }

  return result;
}

app.post("/transform", (req, res) => {
  const json = req.body;
  const data = Array.isArray(json) ? json[0] : json;
  const transformed = buildHierarchy(data);
  res.json(transformed);
});

app.get("/", (req, res) => {
  res.send("JSON Transformation Service Running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
