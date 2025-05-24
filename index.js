// Railway-deployable JSON transformation service using Express (Node.js)
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000;

// Increase body size limit to avoid payload too large errors
app.use(bodyParser.json({ limit: "20mb" }));

function simplifyAnswers(answers) {
  const simplified = {};
  for (const ans of answers) {
    const label = ans?.label || "unknown";
    let value = "";
    if ("value" in ans) {
      value = ans.value;
    } else if (Array.isArray(ans.values) && ans.values.length > 0) {
      if (typeof ans.values[0] === "object") {
        value = ans.values[0]?.value || "";
      } else {
        value = ans.values[0];
      }
    }
    simplified[label] = value;
  }
  return simplified;
}

function buildHierarchy(node, hierarchy = [], result = {}) {
  if (typeof node === "object" && node !== null && !Array.isArray(node)) {
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
        if (key !== "rows" && typeof node[key] === "object" && node[key] !== null) {
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

app.post("/transform", async (req, res) => {
  try {
    const json = req.body;
    const data = Array.isArray(json) ? json[0] : json;
    const transformed = buildHierarchy(data);

    // Forwarding logic
    const forwardUrl = req.query.forward_url;
    if (forwardUrl) {
      try {
        const response = await fetch(forwardUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transformed),
        });
        console.log(`Forwarded to ${forwardUrl}, response status: ${response.status}`);
      } catch (err) {
        console.error(`Failed to forward to ${forwardUrl}:`, err);
      }
    }

    res.json(transformed);
  } catch (error) {
    console.error("Transform error:", error);
    res.status(500).json({ error: "Failed to transform JSON" });
  }
});


app.get("/", (req, res) => {
  res.send("JSON Transformation Service Running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
