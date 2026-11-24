/* Medibot app screens and navigation. */
(function () {
  "use strict";
  var MB = window.MB, E = MB.escape, view = document.getElementById("view");
  var flashMsg = null;

  function flash(text, kind) { flashMsg = { text: text, kind: kind || "info" }; }
  function takeFlash() {
    if (!flashMsg) return "";
    var h = '<div class="flash ' + flashMsg.kind + '">' + E(flashMsg.text) + "</div>"; flashMsg = null; return h;
  }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function $(sel) { return view.querySelector(sel); }
  function on(sel, ev, fn) { var el = $(sel); if (el) el.addEventListener(ev, fn); }
  function busy(btn, yes, label) { btn.disabled = yes; if (label) btn.textContent = label; }
  function disclaimer() {
    return '<p class="disclaimer">Medibot gives general information from <em>The Gale Encyclopedia of Medicine</em>. ' +
      "It is not medical advice or a diagnosis. In an emergency, call your local emergency number.</p>";
  }

  // ---------- status chip (online / offline) ----------
  function updateStatus() {
    var s = MB.settings(), el = document.getElementById("status"), online = MB.isOnline();
    var ai = online && s.groqKey ? "Online AI" : s.ollamaUrl && s.mode !== "offline" ? "Local AI" : "On-device";
    el.className = "status " + (online ? "on" : "off");
    el.textContent = (online ? "Online" : "Offline") + " · " + ai;
  }
  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);
  document.getElementById("status").addEventListener("click", function () { go("#/settings"); });

  // ---------- auth screens ----------
  function registerView() {
    view.innerHTML = '<div class="narrow">' + takeFlash() + '<div class="card"><h1>Create your account</h1>' +
      '<p class="muted">We\'ll send a one-time code to your mobile number to verify it.</p>' +
      '<form id="f"><label>Full name<input name="name" required maxlength="80" autocomplete="name"></label>' +
      '<label>Mobile number<input name="phone" required inputmode="tel" autocomplete="tel" placeholder="9876543210"></label>' +
      '<label>Password<input type="password" name="pw" required minlength="8" autocomplete="new-password">' +
      '<small class="muted">At least 8 characters, with a letter and a number.</small></label>' +
      '<label>Confirm password<input type="password" name="pw2" required minlength="8" autocomplete="new-password"></label>' +
      '<button class="primary block" id="go">Send OTP</button></form>' +
      '<p class="muted">Already registered? <a href="#/login">Log in</a></p></div></div>';
    on("#f", "submit", function (e) {
      e.preventDefault();
      var f = e.target, btn = $("#go"), errors = [], phone;
      var name = f.name.value.trim();
      if (name.length < 2) errors.push("Please enter your full name.");
      try { phone = MB.normalizePhone(f.phone.value); } catch (err) { errors.push(err.message); }
      var probs = MB.passwordProblems(f.pw.value);
      if (probs.length) errors.push("Password needs " + probs.join(", ") + ".");
      if (f.pw.value !== f.pw2.value) errors.push("Passwords do not match.");
      if (phone && MB.users()[phone] && MB.users()[phone].verified) errors.push("This mobile number is already registered on this device. Please log in.");
      if (errors.length) { flash(errors.join(" "), "error"); return registerView(); }
      busy(btn, true, "Sending…");
      MB.hashPassword(f.pw.value).then(function (h) {
        return MB.sendOtp(phone, "register", { name: name, salt: h.salt, hash: h.hash });
      }).then(function (r) {
        flash(r.mode === "sms" ? "We sent a 6-digit code by SMS to " + MB.maskPhone(phone) + "." :
          "No SMS was sent (" + r.reason + "), so your code is shown below.", r.mode === "sms" ? "success" : "info");
        go("#/verify");
      }).catch(function (err) { flash(err.message, "error"); registerView(); });
    });
  }

  function otpBox(p) {
    return p.shownCode ? '<div class="otp-screen"><div class="muted">No SMS was sent. Your code is:</div>' +
      '<div class="otp-code">' + E(p.shownCode) + "</div></div>" : "";
  }
  function resendButton() {
    return '<p><button type="button" class="link" id="resend">Resend code</button></p>';
  }
  function wireResend(again) {
    var b = $("#resend"); if (!b) return;
    var tick = function () {
      var w = MB.resendWait();
      if (!document.body.contains(b)) return;
      b.disabled = w > 0; b.textContent = w > 0 ? "Resend code in " + w + "s" : "Resend code";
      if (w > 0) setTimeout(tick, 1000);
    };
    tick();
    b.addEventListener("click", function () {
      var p = MB.pending(); b.disabled = true;
      MB.sendOtp(p.phone, p.purpose, { name: p.name, salt: p.salt, hash: p.hash })
        .then(function (r) { flash(r.mode === "sms" ? "A new code was sent by SMS." : "No SMS was sent (" + r.reason + "). New code shown below.", "success"); again(); })
        .catch(function (err) { flash(err.message, "error"); again(); });
    });
  }

  function verifyView() {
    var p = MB.pending();
    if (!p || p.purpose !== "register") return go("#/register");
    view.innerHTML = '<div class="narrow">' + takeFlash() + '<div class="card"><h1>Verify your mobile</h1>' +
      '<p class="muted">Enter the code sent to <strong>' + E(MB.maskPhone(p.phone)) + "</strong>.</p>" + otpBox(p) +
      '<form id="f"><label>One-time code<input name="otp" class="otp" required inputmode="numeric" autocomplete="one-time-code" maxlength="6"></label>' +
      '<button class="primary block">Verify and finish registration</button></form>' + resendButton() + "</div></div>";
    wireResend(verifyView);
    on("#f", "submit", function (e) {
      e.preventDefault();
      MB.verifyOtp(e.target.otp.value).then(function (p) {
        var users = MB.users();
        users[p.phone] = { name: p.name, salt: p.salt, hash: p.hash, verified: true, fails: 0, lockedUntil: 0, createdAt: MB.now() };
        MB.saveUsers(users); MB.setPending(null);
        flash("Registration successful! You can now log in with your mobile number and password.", "success");
        sessionStorage.setItem("mb_last_phone", p.phone);
        go("#/login");
      }).catch(function (err) { flash(err.message, "error"); verifyView(); });
    });
  }

  function loginView() {
    var last = sessionStorage.getItem("mb_last_phone") || "";
    view.innerHTML = '<div class="narrow">' + takeFlash() + '<div class="card"><h1>Log in</h1>' +
      '<form id="f"><label>Mobile number<input name="phone" required inputmode="tel" autocomplete="tel" value="' + E(last.replace(MB.settings().countryCode, "")) + '"></label>' +
      '<label>Password<input type="password" name="pw" required autocomplete="current-password"></label>' +
      '<label class="check"><input type="checkbox" name="remember" checked> Keep me logged in</label>' +
      '<button class="primary block" id="go">Log in</button></form>' +
      '<p class="muted"><a href="#/forgot">Forgot password?</a> · New here? <a href="#/register">Create an account</a></p>' +
      '<p class="muted"><a href="#/settings">Settings (online AI, SMS keys)</a></p>' +
      "</div>" + disclaimer() + "</div>";
    on("#f", "submit", function (e) {
      e.preventDefault();
      var f = e.target, phone;
      try { phone = MB.normalizePhone(f.phone.value); } catch (err) { flash(err.message, "error"); return loginView(); }
      busy($("#go"), true, "Logging in…");
      MB.login(phone, f.pw.value).then(function (u) {
        MB.startSession(phone, f.remember.checked);
        flash("Welcome, " + u.name.split(" ")[0] + "!", "success");
        go("#/chat");
      }).catch(function (err) { flash(err.message, "error"); loginView(); });
    });
  }

  function forgotView() {
    view.innerHTML = '<div class="narrow">' + takeFlash() + '<div class="card"><h1>Reset your password</h1>' +
      '<p class="muted">Enter your registered mobile number and we\'ll send you a code.</p>' +
      '<form id="f"><label>Mobile number<input name="phone" required inputmode="tel"></label>' +
      '<button class="primary block" id="go">Send reset code</button></form>' +
      '<p class="muted"><a href="#/login">Back to log in</a></p></div></div>';
    on("#f", "submit", function (e) {
      e.preventDefault();
      var phone;
      try { phone = MB.normalizePhone(e.target.phone.value); } catch (err) { flash(err.message, "error"); return forgotView(); }
      var u = MB.users()[phone];
      if (!u || !u.verified) { flash("No account with this number on this device.", "error"); return forgotView(); }
      busy($("#go"), true, "Sending…");
      MB.sendOtp(phone, "reset").then(function (r) {
        flash(r.mode === "sms" ? "We sent a reset code by SMS to " + MB.maskPhone(phone) + "." : "No SMS was sent (" + r.reason + "), so your code is shown below.", "info");
        go("#/reset");
      }).catch(function (err) { flash(err.message, "error"); forgotView(); });
    });
  }

  function resetView() {
    var p = MB.pending();
    if (!p || p.purpose !== "reset") return go("#/forgot");
    view.innerHTML = '<div class="narrow">' + takeFlash() + '<div class="card"><h1>Choose a new password</h1>' +
      '<p class="muted">Enter the code sent to <strong>' + E(MB.maskPhone(p.phone)) + "</strong>.</p>" + otpBox(p) +
      '<form id="f"><label>One-time code<input name="otp" class="otp" required inputmode="numeric" maxlength="6"></label>' +
      '<label>New password<input type="password" name="pw" required minlength="8" autocomplete="new-password"></label>' +
      '<label>Confirm new password<input type="password" name="pw2" required minlength="8" autocomplete="new-password"></label>' +
      '<button class="primary block">Update password</button></form>' + resendButton() + "</div></div>";
    wireResend(resetView);
    on("#f", "submit", function (e) {
      e.preventDefault();
      var f = e.target, probs = MB.passwordProblems(f.pw.value);
      if (probs.length) { flash("Password needs " + probs.join(", ") + ".", "error"); return resetView(); }
      if (f.pw.value !== f.pw2.value) { flash("Passwords do not match.", "error"); return resetView(); }
      MB.verifyOtp(f.otp.value).then(function (p) {
        return MB.hashPassword(f.pw.value).then(function (h) {
          var users = MB.users(), u = users[p.phone];
          u.salt = h.salt; u.hash = h.hash; u.fails = 0; u.lockedUntil = 0;
          MB.saveUsers(users); MB.setPending(null);
          sessionStorage.setItem("mb_last_phone", p.phone);
          flash("Password updated. Please log in with your new password.", "success");
          go("#/login");
        });
      }).catch(function (err) { flash(err.message, "error"); resetView(); });
    });
  }

  // ---------- chat ----------
  var SUGGESTIONS = ["What are the symptoms of dengue fever?", "How is carpal tunnel syndrome treated?",
    "What causes cataracts?", "How can I prevent food poisoning?"];

  function messageHtml(m) {
    var h = '<div class="message ' + m.role + '"><div class="role">' + (m.role === "user" ? "You" : "Medibot") + "</div>";
    if (m.notice) h += '<div class="notice">⚠️ ' + E(m.notice) + "</div>";
    h += '<div class="content">' + MB.nl2br(m.content) + "</div>";
    if (m.diseases && m.diseases.length) {
      h += '<div class="related">Disease library: ' + m.diseases.map(function (d) {
        return '<a href="#/disease/' + encodeURIComponent(d.slug) + '">' + E(d.name) + "</a>"; }).join(", ") + "</div>";
    }
    if (m.sources && m.sources.length) {
      h += '<details class="sources"><summary>Sources (' + m.sources.length + ")</summary><ul>" + m.sources.map(function (s) {
        return "<li><strong>PDF page " + E(s.page) + "</strong>: “" + E(s.snippet) + "…”</li>"; }).join("") + "</ul></details>";
    }
    if (m.engine) h += '<div class="engine">' + E(m.engine) + "</div>";
    return h + "</div>";
  }

  function chatView(user) {
    var msgs = MB.history(user.phone);
    view.innerHTML = takeFlash() + '<div class="row" style="justify-content:space-between"><h1>Ask a medical question</h1></div>' +
      '<div id="box" class="chat-box">' + (msgs.length ? msgs.map(messageHtml).join("") :
        '<div class="empty" id="empty"><p>Answers come from <em>The Gale Encyclopedia of Medicine</em>, stored on this device.</p>' +
        '<div class="suggestions">' + SUGGESTIONS.map(function (s) { return '<button type="button" class="chip">' + E(s) + "</button>"; }).join("") + "</div></div>") +
      "</div>" +
      '<form id="f" class="chat-form"><textarea id="q" placeholder="e.g. What are the symptoms of chickenpox?" maxlength="1000" required></textarea>' +
      '<button class="primary" id="send">Send</button></form>' + disclaimer();
    var box = $("#box"), q = $("#q"), send = $("#send");
    if (box.lastElementChild) box.lastElementChild.scrollIntoView({ block: "end" });

    function ask(text) {
      text = text.trim(); if (!text || send.disabled) return;
      var empty = $("#empty"); if (empty) empty.remove();
      var history = MB.history(user.phone);
      var um = { role: "user", content: text, at: MB.now() };
      box.insertAdjacentHTML("beforeend", messageHtml(um));
      box.insertAdjacentHTML("beforeend", '<div class="message assistant typing" id="typing"><div class="role">Medibot</div><div class="content">Searching the encyclopedia</div></div>');
      $("#typing").scrollIntoView({ behavior: "smooth", block: "end" });
      send.disabled = true;
      MB.answer(text, history).then(function (r) {
        var am = Object.assign({ role: "assistant", at: MB.now() }, r);
        MB.saveHistory(user.phone, history.concat([um, am]));
        $("#typing").remove();
        box.insertAdjacentHTML("beforeend", messageHtml(am));
      }).catch(function (err) {
        $("#typing").remove();
        box.insertAdjacentHTML("beforeend", messageHtml({ role: "assistant", content: "Sorry, something went wrong: " + err.message }));
      }).then(function () {
        send.disabled = false; box.lastElementChild.scrollIntoView({ behavior: "smooth", block: "end" });
      });
    }
    on("#f", "submit", function (e) { e.preventDefault(); var t = q.value; q.value = ""; ask(t); });
    q.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer:fine)").matches) { e.preventDefault(); $("#f").requestSubmit(); }
    });
    Array.prototype.forEach.call(view.querySelectorAll(".chip"), function (c) { c.addEventListener("click", function () { ask(c.textContent); }); });
  }

  // ---------- library ----------
  function libraryView(params) {
    var q = params.q || "", letter = params.letter || "";
    var list = MB.searchDiseases(q, letter);
    view.innerHTML = "<h1>Disease library</h1>" +
      '<p class="muted">' + MB.diseases().length + " diseases and conditions with symptoms, treatments and remedies. Works offline.</p>" +
      '<form id="f" class="search"><input name="q" value="' + E(q) + '" placeholder="Search by disease or symptom"><button class="primary">Search</button></form>' +
      '<div class="letters"><a href="#/library" class="' + (!letter && !q ? "active" : "") + '">All</a>' +
      MB.letters().map(function (l) { return '<a href="#/library?letter=' + l + '" class="' + (l === letter ? "active" : "") + '">' + l + "</a>"; }).join("") + "</div>" +
      (q ? '<p class="muted">' + list.length + " result(s) for “" + E(q) + "”.</p>" : "") +
      '<div class="grid">' + (list.map(function (d) {
        var t = d.definition || d.description || "";
        return '<a class="tile" href="#/disease/' + encodeURIComponent(d.slug) + '"><h3>' + E(d.name) + "</h3><p>" + E(t.slice(0, 150)) + (t.length > 150 ? "…" : "") + "</p></a>";
      }).join("") || "<p>No diseases found.</p>") + "</div>";
    on("#f", "submit", function (e) { e.preventDefault(); go("#/library?q=" + encodeURIComponent(e.target.q.value.trim())); });
  }

  function diseaseView(slug) {
    var d = MB.disease(slug);
    if (!d) { view.innerHTML = '<p>Not found. <a href="#/library">Back to the library</a></p>'; return; }
    function section(title, text) { return text ? '<section class="dsection"><h2>' + title + "</h2><p>" + MB.nl2br(text) + "</p></section>" : ""; }
    view.innerHTML = '<p><a href="#/library">← Disease library</a></p><h1>' + E(d.name) + "</h1>" +
      '<p class="muted">Source: Gale Encyclopedia of Medicine, PDF page ' + E(d.source_page) + "</p>" +
      '<div class="notice">Educational information from a 2nd-edition encyclopedia; it may be dated. Talk to a doctor before starting, stopping or changing any treatment.</div>' +
      section("What it is", d.definition) +
      (d.symptoms.length ? '<section class="dsection"><h2>Common symptoms</h2><ul class="symptoms">' + d.symptoms.map(function (s) { return "<li>" + E(s) + "</li>"; }).join("") + "</ul></section>" : "") +
      section("Causes and symptoms", d.causes_and_symptoms) + section("Treatment", d.treatment) +
      section("Remedies and alternative treatment", d.alternative_treatment) + section("Prevention", d.prevention) +
      section("Diagnosis", d.diagnosis) + section("Prognosis", d.prognosis) + section("Description", d.description) +
      '<p><a class="button primary" href="#/chat">Ask Medibot</a></p>';
    window.scrollTo(0, 0);
  }

  function checkerView(params) {
    var text = params.s || "", r = text ? MB.symptomCheck(text) : null;
    view.innerHTML = "<h1>Symptom checker</h1>" +
      '<div class="notice">A simple keyword search of the encyclopedia, for learning only. It cannot diagnose you. If you feel unwell, see a doctor.</div>' +
      '<form id="f" class="search"><input name="s" value="' + E(text) + '" placeholder="e.g. fever, headache, rash" required><button class="primary">Check</button></form>' +
      (r ? '<p class="muted">Looking for: ' + E(r.terms.join(", ")) + "</p>" + (r.results.map(function (x) {
        return '<a class="tile" href="#/disease/' + encodeURIComponent(x.d.slug) + '"><h3>' + E(x.d.name) +
          ' <span class="badge">' + x.matched.length + "/" + r.terms.length + " matched</span></h3><p>Matches: " + E(x.matched.join(", ")) +
          '</p><p class="muted">' + E((x.d.definition || "").slice(0, 170)) + "…</p></a>";
      }).join("") || "<p>No matching conditions found. Try simpler words like “fever” or “cough”.</p>") : "");
    on("#f", "submit", function (e) { e.preventDefault(); go("#/checker?s=" + encodeURIComponent(e.target.s.value)); });
  }

  // ---------- settings ----------
  function settingsView(user) {
    var s = MB.settings();
    function field(label, name, value, extra) {
      return "<label>" + label + '<input name="' + name + '" value="' + E(value) + '" ' + (extra || "") + "></label>";
    }
    view.innerHTML = takeFlash() + "<h1>Settings</h1>" +
      '<form id="f">' +
      '<div class="settings-group"><h2>Mode</h2>' +
      '<label class="check"><input type="radio" name="mode" value="auto"' + (s.mode !== "offline" ? " checked" : "") + "> Online when available (uses AI and real SMS if set up below)</label>" +
      '<label class="check"><input type="radio" name="mode" value="offline"' + (s.mode === "offline" ? " checked" : "") + "> Always offline (everything stays on this device)</label>" +
      '<p class="muted">Right now: <strong>' + (MB.isOnline() ? "online" : "offline") + "</strong>. Without internet, Medibot answers from the encyclopedia stored on this device.</p></div>" +

      '<div class="settings-group"><h2>Online AI (Groq)</h2><p class="muted">Free key: console.groq.com/keys. Stored only on this device.</p>' +
      field("Groq API key", "groqKey", s.groqKey, 'type="password" autocomplete="off"') +
      '<label>Model<select name="groqModel"><option value="">Choose automatically</option>' +
      (s.groqModel ? '<option selected value="' + E(s.groqModel) + '">' + E(s.groqModel) + "</option>" : "") + "</select></label>" +
      '<button type="button" id="loadModels">Test key and load models</button> <span id="groqMsg" class="muted"></span></div>' +

      '<div class="settings-group"><h2>Local AI on your Wi-Fi (Ollama)</h2>' +
      '<p class="muted">Works without internet: a laptop on the same Wi-Fi or hotspot runs the AI. See readme.txt.</p>' +
      field("Ollama address", "ollamaUrl", s.ollamaUrl, 'placeholder="http://192.168.43.10:11434" inputmode="url"') +
      field("Model", "ollamaModel", s.ollamaModel) +
      '<button type="button" id="testOllama">Test connection</button> <span id="ollamaMsg" class="muted"></span></div>' +

      '<div class="settings-group"><h2>Real SMS for OTP</h2>' +
      '<p class="muted">Without keys (or offline), the code is shown on screen instead.</p>' +
      field("Fast2SMS API key (India)", "fast2smsKey", s.fast2smsKey, 'type="password" autocomplete="off"') +
      field("Twilio Account SID", "twilioSid", s.twilioSid) +
      field("Twilio Auth Token", "twilioToken", s.twilioToken, 'type="password" autocomplete="off"') +
      field("Twilio phone number", "twilioFrom", s.twilioFrom, 'placeholder="+1XXXXXXXXXX"') +
      field("Default country code", "countryCode", s.countryCode) +
      '<label class="check"><input type="checkbox" name="showOtpOnScreen"' + (s.showOtpOnScreen ? " checked" : "") + "> Show the code on screen when no SMS can be sent</label></div>" +
      '<button class="primary block">Save settings</button></form>' +

      '<div class="settings-group" style="margin-top:1rem"><h2>Account</h2>' +
      (user ? "<p>Logged in as <strong>" + E(user.name) + "</strong> (" + E(MB.maskPhone(user.phone)) + ")</p>" +
        '<div class="row"><button id="logout">Log out</button><button id="clear">Clear chat history</button></div>' : '<p><a href="#/login">← Back to log in</a></p>') +
      "</div>" +
      '<div class="settings-group"><h2>About</h2><p>Medibot answers from <em>The Gale Encyclopedia of Medicine</em> (Volume C–F) stored on this device, ' +
      "with " + MB.diseases().length + " diseases in its library. Online, it can also use a cloud AI model; on a local network it can use a laptop's AI; " +
      "with no connection it still works using on-device search.</p><p class=\"muted\">For education only. Not a substitute for a doctor.</p></div>";

    on("#f", "submit", function (e) {
      e.preventDefault();
      var f = e.target, ns = MB.settings();
      ["groqKey", "groqModel", "ollamaUrl", "ollamaModel", "fast2smsKey", "twilioSid", "twilioToken", "twilioFrom", "countryCode"]
        .forEach(function (k) { ns[k] = f[k].value.trim(); });
      ns.mode = f.mode.value; ns.showOtpOnScreen = f.showOtpOnScreen.checked;
      if (!/^\+\d{1,4}$/.test(ns.countryCode)) ns.countryCode = "+91";
      MB.saveSettings(ns); updateStatus();
      flash("Settings saved.", "success"); settingsView(user); window.scrollTo(0, 0);
    });
    on("#loadModels", "click", function () {
      var key = $("#f").groqKey.value.trim(), msg = $("#groqMsg");
      if (!key) { msg.textContent = "Enter a key first."; return; }
      msg.textContent = "Checking…";
      MB.groqModels(key).then(function (ids) {
        var sel = $("#f").groqModel, cur = sel.value;
        sel.innerHTML = '<option value="">Choose automatically</option>' + ids.map(function (id) {
          return '<option value="' + E(id) + '"' + (id === cur ? " selected" : "") + ">" + E(id) + "</option>"; }).join("");
        msg.textContent = "Key works. " + ids.length + " models available. Remember to save.";
      }).catch(function (err) { msg.textContent = err.name === "AbortError" ? "Timed out (offline?)" : err.message; });
    });
    on("#testOllama", "click", function () {
      var url = $("#f").ollamaUrl.value.trim(), msg = $("#ollamaMsg");
      if (!url) { msg.textContent = "Enter the address first."; return; }
      msg.textContent = "Connecting…";
      MB.testOllama(url).then(function (models) { msg.textContent = "Connected. Models: " + (models.join(", ") || "none installed"); })
        .catch(function () { msg.textContent = "Could not connect. Check the address, Wi-Fi, and readme.txt."; });
    });
    on("#logout", "click", function () { MB.logout(); flash("You have been logged out.", "info"); go("#/login"); });
    on("#clear", "click", function () { if (confirm("Clear your chat history?")) { MB.saveHistory(user.phone, []); flash("Chat history cleared.", "info"); settingsView(user); } });
  }

  // ---------- router ----------
  var PUBLIC = { login: loginView, register: registerView, verify: verifyView, forgot: forgotView, reset: resetView };
  function parse() {
    var h = location.hash.replace(/^#\/?/, ""), qi = h.indexOf("?"), path = qi >= 0 ? h.slice(0, qi) : h, params = {};
    if (qi >= 0) h.slice(qi + 1).split("&").forEach(function (kv) { var p = kv.split("="); params[p[0]] = decodeURIComponent((p[1] || "").replace(/\+/g, " ")); });
    var parts = path.split("/");
    return { name: parts[0] || "chat", arg: decodeURIComponent(parts[1] || ""), params: params };
  }
  function render() {
    var r = parse(), user = MB.currentUser(), tabbar = document.getElementById("tabbar");
    updateStatus();
    if (PUBLIC[r.name]) {
      if (user && (r.name === "login" || r.name === "register")) return go("#/chat");
      tabbar.hidden = true; return PUBLIC[r.name]();
    }
    if (!user && r.name === "settings") { tabbar.hidden = true; return settingsView(null); }
    if (!user) { tabbar.hidden = true; return go("#/login"); }
    tabbar.hidden = false;
    Array.prototype.forEach.call(tabbar.querySelectorAll("a"), function (a) {
      a.classList.toggle("active", a.dataset.tab === r.name || (r.name === "disease" && a.dataset.tab === "library"));
    });
    if (r.name === "library") return libraryView(r.params);
    if (r.name === "disease") return diseaseView(r.arg);
    if (r.name === "checker") return checkerView(r.params);
    if (r.name === "settings") return settingsView(user);
    return chatView(user);
  }
  window.addEventListener("hashchange", render);
  render();

  // Preload encyclopedia text in the background so the first answer is quick.
  setTimeout(function () { MB.ensurePassages().catch(function () {}); }, 800);

  // Installable web app (PWA): cache everything for offline use. Not needed inside the Android app.
  if ("serviceWorker" in navigator && !window.Capacitor && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
})();
