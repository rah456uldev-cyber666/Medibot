/* Answering questions: online AI (Groq), local-network AI (Ollama on a laptop), or fully offline. */
(function () {
  "use strict";
  var MB = (window.MB = window.MB || {});

  var EMERGENCY = /chest pain|can'?t breathe|cannot breathe|difficulty breathing|not breathing|unconscious|severe bleeding|bleeding heavily|heart attack|stroke|overdose|poison(ed|ing)|seizure/i;
  var SELF_HARM = /suicid|kill myself|self[- ]harm|end my life/i;
  MB.emergencyNotice = function (q) {
    if (SELF_HARM.test(q)) return "If you are thinking about harming yourself, please reach out right now: call your local emergency number, or a crisis line such as 14416 (Tele-MANAS, India) or 988 (US). You are not alone.";
    if (EMERGENCY.test(q)) return "This may be a medical emergency. Please call your local emergency number (112 in India and Europe, 911 in the US) or go to the nearest hospital now.";
    return null;
  };

  var INTENTS = [
    ["symptoms", /symptom|sign|feel like|look like|indicat/i, "causes_and_symptoms", "Symptoms"],
    ["treatment", /treat|cure|medic|remed|therap|manage|drug|home care|get rid|heal/i, "treatment", "Treatment"],
    ["alternative", /remed|natural|herbal|home|alternative|ayurved|diet/i, "alternative_treatment", "Remedies / alternative treatment"],
    ["prevention", /prevent|avoid|protect|stop getting|reduce risk/i, "prevention", "Prevention"],
    ["causes", /cause|why|reason|risk factor|spread|catch|transmi/i, "causes_and_symptoms", "Causes"],
    ["diagnosis", /diagnos|test|detect|confirm|check for/i, "diagnosis", "Diagnosis"],
    ["prognosis", /prognos|outlook|recover|fatal|serious|how long|dangerous|die/i, "prognosis", "Outlook"]
  ];

  function sentences(text) { return String(text || "").split(/(?<=[.!?])\s+(?=[A-Z•])/); }
  function firstSentences(text, n) { return sentences(text).slice(0, n).join(" "); }
  function bestSentences(text, query, n) {
    var q = MB.tokens(query), set = {}; q.forEach(function (t) { set[t] = 1; });
    var ranked = sentences(text).map(function (s, i) {
      var score = 0; MB.tokens(s).forEach(function (t) { if (set[t]) score += 1; });
      return { s: s, i: i, score: score };
    });
    var top = ranked.slice().sort(function (a, b) { return b.score - a.score || a.i - b.i; }).slice(0, n);
    return top.sort(function (a, b) { return a.i - b.i; }).map(function (x) {
      return x.s.length > 320 ? x.s.slice(0, 320).replace(/\s+\S*$/, "") + "…" : x.s;
    }).join(" ");
  }

  /** Offline answer composed from the disease library and the encyclopedia text. */
  MB.offlineAnswer = function (question, diseases, passages) {
    var parts = [], sources = [];
    if (diseases.length) {
      diseases.forEach(function (d) {
        var picked = INTENTS.filter(function (it) { return it[1].test(question) && d[it[2]]; });
        parts.push(d.name.toUpperCase());
        if (!picked.length) {
          if (d.definition) parts.push(firstSentences(d.definition, 2));
          if (d.symptoms.length) parts.push("Common symptoms: " + d.symptoms.slice(0, 10).join(", ") + ".");
          if (d.treatment) parts.push("Treatment: " + firstSentences(d.treatment, 2));
        } else {
          picked.forEach(function (it) {
            if (it[0] === "symptoms" && d.symptoms.length) parts.push("Common symptoms: " + d.symptoms.slice(0, 12).join(", ") + ".");
            else parts.push(it[3] + ": " + (it[0] === "causes" ? bestSentences(d[it[2]], question + " cause caused", 3) : firstSentences(d[it[2]], 4)));
          });
        }
        sources.push({ page: d.source_page, snippet: "Disease library: " + d.name, slug: d.slug });
      });
    } else if (passages.length) {
      var text = passages.slice(0, 3).map(function (p) { return p.t; }).join(" ");
      parts.push("Here is what the encyclopedia says (page " + passages[0].p + "):");
      parts.push(bestSentences(text, question, 3));
    } else {
      parts.push("I could not find this in the encyclopedia on this device (it covers diseases from C to F). Try other words, or check the Disease Library.");
    }
    passages.slice(0, 3).forEach(function (p) { sources.push({ page: p.p, snippet: p.t.slice(0, 200) }); });
    return { content: parts.join("\n\n"), sources: sources };
  };

  var PROMPT = "You are Medibot, a careful medical information assistant.\n" +
    "Answer the user's question using ONLY the encyclopedia context and disease notes below.\n" +
    "- Be clear and concise (one short paragraph, or a short bullet list when listing symptoms or treatments).\n" +
    "- If the context does not contain the answer, say you could not find it in the encyclopedia. Do not guess.\n" +
    "- Never give a definitive diagnosis or exact drug doses. Suggest seeing a doctor where appropriate.\n\n" +
    "Recent conversation:\n{history}\n\nDisease notes:\n{diseases}\n\nEncyclopedia context:\n{context}\n\nQuestion: {question}\n\nAnswer:";

  function diseaseNotes(d) {
    return ["Disease: " + d.name, d.definition && "Definition: " + d.definition,
      d.symptoms.length && "Common symptoms: " + d.symptoms.join("; "),
      d.treatment && "Treatment: " + d.treatment.slice(0, 600), d.prevention && "Prevention: " + d.prevention.slice(0, 300)]
      .filter(Boolean).join("\n").slice(0, 1500);
  }
  function buildPrompt(question, history, diseases, passages) {
    return PROMPT.replace("{history}", history.slice(-6).map(function (m) { return (m.role === "user" ? "User: " : "Assistant: ") + m.content.slice(0, 500); }).join("\n") || "(none)")
      .replace("{diseases}", diseases.map(diseaseNotes).join("\n\n") || "(none)")
      .replace("{context}", passages.map(function (p) { return "[page " + p.p + "] " + p.t; }).join("\n\n---\n\n") || "(nothing found)")
      .replace("{question}", question);
  }
  function timeout(ms) { var c = new AbortController(); setTimeout(function () { c.abort(); }, ms); return c.signal; }

  MB.groqModels = function (key) {
    return fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: "Bearer " + key }, signal: timeout(15000) })
      .then(function (r) { if (!r.ok) throw new Error("Groq error " + r.status + (r.status === 401 ? " (wrong API key)" : "")); return r.json(); })
      .then(function (j) {
        return (j.data || []).filter(function (m) { return m.active !== false && !/whisper|tts|guard|embed|playai/i.test(m.id); })
          .map(function (m) { return m.id; }).sort();
      });
  };
  function pickGroqModel(s) {
    if (s.groqModel) return Promise.resolve(s.groqModel);
    return MB.groqModels(s.groqKey).then(function (ids) {
      var pref = ids.filter(function (id) { return /llama|gpt-oss|qwen|gemma|mixtral/i.test(id); });
      var chosen = pref.filter(function (id) { return /instant|8b/i.test(id); })[0] || pref[0] || ids[0];
      if (!chosen) throw new Error("No chat models available for this Groq key");
      s.groqModel = chosen; MB.saveSettings(s);
      return chosen;
    });
  }
  function askGroq(prompt, s) {
    return pickGroqModel(s).then(function (model) {
      return fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST", headers: { Authorization: "Bearer " + s.groqKey, "Content-Type": "application/json" },
        body: JSON.stringify({ model: model, temperature: 0.2, max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
        signal: timeout(45000)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) {
            var msg = (j.error && j.error.message) || ("error " + r.status);
            if (/model/i.test(msg)) { s.groqModel = ""; MB.saveSettings(s); } // pick a new model next time
            throw new Error("Groq: " + msg);
          }
          return { text: j.choices[0].message.content.trim(), engine: "Online AI (Groq · " + model + ")" };
        });
      });
    });
  }
  function askOllama(prompt, s) {
    var url = s.ollamaUrl.replace(/\/+$/, "");
    return fetch(url + "/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: s.ollamaModel, stream: false, messages: [{ role: "user", content: prompt }],
        options: { temperature: 0.2, num_predict: 600 } }),
      signal: timeout(180000)
    }).then(function (r) {
      if (!r.ok) throw new Error("Ollama error " + r.status + (r.status === 404 ? " (model not installed: ollama pull " + s.ollamaModel + ")" : ""));
      return r.json();
    }).then(function (j) { return { text: (j.message && j.message.content || "").trim(), engine: "Local AI on your network (" + s.ollamaModel + ")" }; });
  }
  MB.testOllama = function (url) {
    return fetch(url.replace(/\/+$/, "") + "/api/tags", { signal: timeout(5000) }).then(function (r) { return r.json(); })
      .then(function (j) { return (j.models || []).map(function (m) { return m.name; }); });
  };

  /** Library diseases whose symptoms/definition share the most words with the question. */
  MB.relatedDiseases = function (question, n) {
    var q = MB.tokens(question), set = {};
    q.forEach(function (t) { set[t] = 1; });
    if (!q.length) return [];
    return MB.diseases().map(function (d) {
      var score = 0, seen = {};
      MB.tokens(d.name + " " + d.symptoms.join(" ") + " " + (d.definition || "")).forEach(function (t) {
        if (set[t] && !seen[t]) { seen[t] = 1; score += MB.idf(t); }
      });
      return { d: d, score: score };
    }).filter(function (x) { return x.score > 6; })
      .sort(function (a, b) { return b.score - a.score; }).slice(0, n).map(function (x) { return x.d; });
  };

  /** Main entry: returns {content, sources, diseases, notice, engine}. */
  MB.answer = function (question, history) {
    var s = MB.settings();
    var diseases = MB.findMentioned(question, 2);
    var notice = MB.emergencyNotice(question);
    return MB.ensurePassages().then(function () {
      var lastUser = history.filter(function (m) { return m.role === "user"; }).slice(-1)[0];
      var query = question;
      // short follow-ups ("how is it treated?") borrow the previous question's topic
      if (lastUser && MB.tokens(question).length < 4 && !diseases.length) {
        query = lastUser.content + " " + question;
        diseases = MB.findMentioned(lastUser.content, 1);
      }
      var passages = MB.searchPassages(query, 4);
      var offline = MB.offlineAnswer(query, diseases, passages);
      var links = diseases.length ? diseases : MB.relatedDiseases(query, 3);
      var base = { sources: offline.sources, notice: notice,
        diseases: links.map(function (d) { return { slug: d.slug, name: d.name }; }) };

      var engines = [];
      if (MB.isOnline() && s.groqKey) engines.push(askGroq);
      if (s.mode !== "offline" && s.ollamaUrl) engines.push(askOllama);
      var prompt = buildPrompt(question, history, diseases, passages), errors = [];
      function tryNext(i) {
        if (i >= engines.length) {
          return Object.assign(base, { content: offline.content,
            engine: "Offline answer from the encyclopedia on this device" + (errors.length ? " (AI unavailable: " + errors[errors.length - 1] + ")" : "") });
        }
        return engines[i](prompt, s).then(function (r) { return Object.assign(base, { content: r.text, engine: r.engine }); },
          function (e) { errors.push(e.name === "AbortError" ? "timed out" : e.message); return tryNext(i + 1); });
      }
      return tryNext(0);
    });
  };
})();
