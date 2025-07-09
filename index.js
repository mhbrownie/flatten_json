require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

const app = express();
const port = process.env.PORT || 3000;

const BUBBLE_API_URL = process.env.BUBBLE_API_URL;
const BUBBLE_AUTH_HEADER = process.env.BUBBLE_AUTH_TOKEN;

app.use(bodyParser.json({ limit: "20mb" }));

async function uploadFileToBubble(file) {
  console.log(`[📤] Uploading file: ${file.filename} (${file.contentType})`);
  const payload = {
    field_name: "file",
    filename: file.filename,
    file: file.bytes,
  };

  const response = await fetch(BUBBLE_API_URL, {
    method: "POST",
    headers: {
      Authorization: BUBBLE_AUTH_HEADER,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  if (!response.ok) {
    console.error(`[❌] Upload failed for ${file.filename}: ${text}`);
    return { ...file, url: null };
  }

  try {
    const json = JSON.parse(text);
    const url = json.response.url || null;
    console.log(`[✅] Uploaded to: ${url}`);
    return {
      filename: file.filename,
      contentType: file.contentType,
      url,
    };
  } catch (parseErr) {
    console.error(`[⚠️] Failed to parse Bubble response: ${text}`);
    return { ...file, url: null };
  }
}

async function simplifyAnswers(answers) {
  const simplified = {};

  for (const ans of answers) {
    const label = ans?.label || "unknown";
    let value = "";

    const isFileObject = (obj) =>
      obj &&
      typeof obj === "object" &&
      typeof obj.bytes === "string" &&
      "filename" in obj &&
      "contentType" in obj;

    // Case 1: Single file object under "value"
    if (isFileObject(ans.value)) {
      console.log(`[📎] Detected single file upload for "${label}"`);
      const uploaded = await uploadFileToBubble(ans.value);
      value = uploaded;

    // Case 2: Array of file objects under "values"
    } else if (Array.isArray(ans.values) && ans.values.length > 0 && isFileObject(ans.values[0])) {
      console.log(`[📎] Detected multiple file uploads for "${label}"`);
      const uploaded = await Promise.all(ans.values.map(uploadFileToBubble));
      value = uploaded.length === 1 ? uploaded[0] : uploaded;

    // Case 3: Array of primitive or value objects
    } else if (Array.isArray(ans.values) && ans.values.length > 0) {
      const first = ans.values[0];
      if (typeof first === "object" && "value" in first) {
        value = first.value;
      } else {
        value = first;
      }

    // Case 4: Simple field with scalar value
    } else if ("value" in ans) {
      value = ans.value;
    }

    simplified[label] = value;
  }

  console.log(`[🧾] Simplified answers:`, simplified);
  return simplified;
}


async function buildHierarchy(node, hierarchy = [], result = {}) {
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
      const simplified = await simplifyAnswers(node.answers);
      target._answers.push(simplified);
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
        await buildHierarchy(row, [], rowObj);
        target._rows.push(rowObj);
      }
    } else {
      for (const key in node) {
        if (key !== "rows" && typeof node[key] === "object" && node[key] !== null) {
          await buildHierarchy(node[key], hierarchy, result);
        }
      }
    }
  } else if (Array.isArray(node)) {
    for (const item of node) {
      await buildHierarchy(item, hierarchy, result);
    }
  }

  return result;
}

app.post("/transform", async (req, res) => {
  try {
    const json = req.body;
    const data = Array.isArray(json) ? json[0] : json;

    console.log(`[📥] Received payload with identifier: ${data.identifier}`);

    const transformed = await buildHierarchy(data);

    const output = {
      identifier: data.identifier || null,
      ...transformed,
    };

    const forwardUrl = req.query.forward_url;
    if (forwardUrl) {
      console.log(`[🚀] Forwarding to: ${forwardUrl}`);
      try {
        const response = await fetch(forwardUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(output),
        });
        console.log(`[📡] Forwarded, status: ${response.status}`);
      } catch (err) {
        console.error(`[❗] Forwarding failed:`, err.message);
      }
    }

    res.json(output);
  } catch (error) {
    console.error(`[🔥] Transform error:`, error.stack || error.message);
    res.status(500).json({ error: "Failed to transform JSON" });
  }
});

app.get("/", (req, res) => {
  res.send("JSON Transformation Service Running");
});

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
