==========================================================================
 MEDIBOT 3.0 - medical chatbot APP for phones and PC, online and offline
==========================================================================

WHAT IT IS
----------
Medibot answers medical questions using "The Gale Encyclopedia of Medicine"
(the PDF in Data/). It is a RAG (retrieval-augmented generation) app:

  1. The PDF is split into small chunks and turned into embeddings
     (all-MiniLM-L6-v2), stored in a FAISS index (vectorstore/db_faiss).
  2. When you ask a question, the most relevant chunks are found and given,
     together with your recent conversation, to an AI model that runs ON YOUR
     OWN COMPUTER (Llama 3.2 via Ollama). It answers using ONLY that text, and
     every answer shows the PDF pages it used.

Everything runs offline: the AI model, the search index, the embedding model,
the disease database and the user accounts all live on the computer. Internet
is only needed once, for setup, and optionally for sending real OTP SMS.

Users register with their mobile number, verify it with an OTP, and then log
in with their mobile number + password. With SMS keys set and internet
available, the OTP goes by real SMS to the user's own phone. Without them, the
OTP is shown on the screen (offline mode).

A separate disease database (database/diseases.db) holds the symptoms,
treatments, remedies (alternative treatments) and prevention advice for every
disease/condition found in the encyclopedia. It powers the Disease Library and
the Symptom Checker pages, and the chatbot uses it to enrich its answers.

IMPORTANT: Medibot is for education only. It is not a doctor and does not
diagnose. The encyclopedia is a 2nd edition (early 2000s) and may be out of date.


WHY OFFLINE? (what to tell your examiner)
-----------------------------------------
"Sir/Ma'am, unlike ChatGPT or other online AI apps, Medibot runs completely
offline. The AI model, the medical knowledge base and the user database are all
stored on this computer. That gives four advantages:

  1. Works without internet - in rural clinics, villages, ambulances, or during
     network outages, exactly where medical information is hardest to get.
  2. Privacy - health questions are sensitive. Nothing the patient types is
     sent to any company's server; it never leaves this machine.
  3. Trustworthy answers - it answers only from a published medical
     encyclopedia and shows the page number for every answer, so it can be
     checked. General chatbots answer from the whole internet and can make
     things up.
  4. Zero running cost - no API fees or subscriptions, and no dependence on a
     cloud service that can change its models or shut down.

You can demonstrate it live: turn off Wi-Fi, run
    python scripts/check_offline.py
and then ask Medibot a question."



THE MEDIBOT APP (ANDROID PHONES, PC, iPHONE) - NEW IN 3.0
==========================================================
The folder mobile/ contains Medibot as a real app that installs on phones and
computers and works by itself, with or without internet. Nothing else needs to
be running.

What runs ON THE DEVICE (no internet, no laptop needed)
  * Register / log in with mobile number + password (stored on that phone,
    password hashed with PBKDF2-SHA256)
  * Chat: answers from the encyclopedia text stored inside the app (all 759
    pages, searched on the device), with page numbers
  * Disease library (203 diseases: symptoms, treatment, remedies, prevention)
  * Symptom checker, emergency/helpline warnings, chat history

ONLINE vs OFFLINE MODE (switches automatically; the badge at the top shows it)
                     | Online (internet + keys set)  | Offline
  -------------------+-------------------------------+------------------------------
  Answers            | AI answers from Groq cloud    | answers built from the
                     | (Llama), using the same       | encyclopedia + disease
                     | encyclopedia passages         | library on the device
  OTP code           | real SMS to that phone        | shown on screen
                     | (Fast2SMS, then Twilio)       |
  Everything else    | same                          | same

  Middle option, no internet needed: if a laptop on the same Wi-Fi/hotspot runs
  Ollama, the app can use it for AI answers (Settings > Local AI). See below.
  In Settings you can also force "Always offline".

Honest limits (good to know before the viva)
  * The offline answers are put together from the encyclopedia text, not
    written by an AI model. A real AI model is too big to run inside a phone
    app reliably, so AI answers need internet (Groq) or a laptop (Ollama).
    For questions about a named disease the offline answers are very good;
    for vague questions they show the closest passages.
  * Accounts are stored per device: an account made on one phone does not
    exist on another phone (there is no central server, by design, so it
    works offline). Each phone registers its own users.
  * For real SMS, the SMS key is typed into the app's Settings and kept on
    that phone. That is fine for a project demo; a public app would keep the
    key on a server instead.
  * The encyclopedia PDF is Volume 2 (C to F); diseases from other letters are
    not covered unless you add the other volumes (see DISEASE DATABASE).


GETTING THE ANDROID APK - EASY WAY (free, no Android Studio needed)
  1. Create a free account at https://github.com and a new repository
     (for example "medibot"). Private is fine.
  2. Upload the CONTENTS of the Medibot folder to it (so .github/ and mobile/
     are at the top level). Easiest: install GitHub Desktop, "Add existing
     repository", choose the Medibot folder, then Publish. Do NOT upload .env.
  3. On GitHub open the "Actions" tab, enable workflows if asked, choose
     "Build Android APK" and click "Run workflow" (it also runs on every push).
  4. After about 5-10 minutes, open the finished run and download
     "medibot-apk" under Artifacts. Unzip it to get Medibot.apk.
  5. Send Medibot.apk to each phone (Google Drive, USB cable or Bluetooth). On the phone,
     tap it and allow "Install unknown apps" when Android asks.
     Works on Android 7.0 and newer.

GETTING THE ANDROID APK - WITH ANDROID STUDIO (on your PC)
  1. Install Node.js 22 (https://nodejs.org) and Android Studio
     (https://developer.android.com/studio).
  2. In Command Prompt:
        cd Medibot\mobile
        npm install
        npx cap sync android
        npx cap open android
  3. In Android Studio: Build > Build App Bundle(s) / APK(s) > Build APK(s).
     The APK is in mobile\android\app\build\outputs\apk\debug\app-debug.apk
     Or connect your phone with USB debugging on and press the green Run button.

ON A PC (Windows, Mac, Linux)
  * Quick: double-click mobile\Medibot-PC.bat (Windows, needs Python). It
    opens Medibot in its own window and works offline. For a Start-menu /
    desktop icon, open http://127.0.0.1:8080 in Edge or Chrome while the .bat
    is running and click "Install app" in the address bar.
  * Or open the GitHub Pages link (next section) in Chrome or Edge and click
    the "Install app" icon in the address bar.

ON iPHONE (and any phone, without installing an APK)
  1. Publish the web app once: on GitHub, Settings > Pages > Source:
     "GitHub Actions", then Actions > "Publish web app" > Run workflow.
  2. Open https://<your-username>.github.io/<repo-name>/ in Safari (iPhone)
     or Chrome (Android), then Share > "Add to Home Screen" (iPhone) or
     menu > "Install app" (Android).
  3. Open it once while online; after that it works offline.
  (GitHub Pages is public: anyone with the link can open the app, but each
   user's data stays on their own device.)

ONLINE AI (Groq) IN THE APP
  Settings > Online AI: paste your Groq key (free at
  https://console.groq.com/keys), tap "Test key and load models", pick a
  model (or leave "Choose automatically") and Save. This also fixes the
  "model_not_found" error: the list only shows models your key can use.

LOCAL AI OVER WI-FI (no internet), using your laptop
  1. On the laptop, install Ollama and run: ollama pull llama3.2:3b
  2. Let other devices reach it. In Command Prompt (Windows):
        setx OLLAMA_HOST 0.0.0.0
        setx OLLAMA_ORIGINS *
     then quit Ollama from the tray icon and start it again. Allow it through
     Windows Firewall on Private networks when asked.
  3. Connect the phone to the same Wi-Fi, or turn on the laptop's Mobile
     Hotspot (works with no internet). Find the laptop's IP with "ipconfig"
     (IPv4 Address, e.g. 192.168.137.1).
  4. In the app: Settings > Local AI > Ollama address:
        http://192.168.137.1:11434   > Test connection > Save.

REAL OTP SMS IN THE APP
  Settings > Real SMS: paste a Fast2SMS key (India) and/or Twilio details
  (see "GETTING A FAST2SMS KEY" / "GETTING TWILIO KEYS" below), Save, then
  register. With internet and a key, the OTP goes to the number entered.
  Optional: to build keys into every copy of the app, put them in
  mobile\www\config.js before building (anyone who unpacks the APK can then
  read them).

UPDATING THE APP'S DATA
  After rebuilding the disease database or adding PDFs:
        python scripts/build_mobile_data.py
  then rebuild the APK (push to GitHub, or "npx cap sync android" + build).

WHAT IS IN mobile/
  www/                      the app itself (HTML/CSS/JavaScript, no internet needed)
    js/core.js              accounts, password hashing, OTP, SMS
    js/search.js            on-device encyclopedia search (BM25) and disease library
    js/answer.js            online AI (Groq), local AI (Ollama), offline answers
    js/app.js               screens: login, register, OTP, chat, library, symptoms, settings
    data/                   encyclopedia passages and disease library (built by the script)
    sw.js, manifest.webmanifest   lets PCs/iPhones install it and use it offline
    config.js               optional built-in keys
  android/                  Android Studio project (Capacitor)
  capacitor.config.json, package.json, package-lock.json
  Medibot-PC.bat            run the app on a Windows PC

The Python web server version (below) is still included. It is the "server
edition" for a laptop with the full AI pipeline (Ollama + semantic search).


FOLDER LAYOUT (SERVER EDITION)
-------------
  app/
    application.py        Flask app (create_app), error pages, /health, /about
    chat.py               chat page + /api/chat, history saved per user
    db.py                 SQLite database for users, OTP codes, chat history
    auth/                 registration, OTP, login, logout, password reset
      routes.py           pages: /register /verify /login /logout /forgot-password /reset-password
      otp.py              OTP generation, expiry, attempt limits, resend limits
      sms.py              real SMS (Fast2SMS, Twilio) with on-screen fallback when offline
      phone.py            mobile number validation (E.164 format)
      security.py         CSRF protection, login_required, password rules
    diseases/             disease library, symptom checker, /api/diseases
    components/           RAG pipeline (PDF loading, embeddings, FAISS, local LLM, retriever)
      llm.py              local Ollama model (default) or Groq cloud (optional)
    config/config.py      all settings (read from .env)
    templates/, static/   HTML pages, CSS and JavaScript
  scripts/
    build_disease_db.py   extracts diseases from the PDF(s) into database/diseases.db
    download_models.py    one-time: saves the embedding model into models/
    check_offline.py      checks that everything needed for offline use is ready
  models/                 local embedding model (created by download_models.py)
  database/
    diseases.db           disease database (203 diseases/conditions, ready to use)
    diseases.json         the same data as JSON
    medibot.db            users + chats (created automatically on first run)
  Data/                   encyclopedia PDF(s)
  vectorstore/db_faiss/   FAISS index of the PDF (ready to use)
  tests/                  automated tests (pytest)
  .env.example            template for your settings
  requirements.txt, setup.py, Dockerfile


OFFLINE SETUP ON WINDOWS (do steps 1-6 once, with internet)
-----------------------------------------------------------
Requirements: Windows 10/11, Python 3.10 - 3.13, about 6 GB free disk space,
8 GB RAM recommended (4 GB works with the smaller model in step 4).

1. Install Ollama (runs the AI model locally):
     Download and install from https://ollama.com/download
     It starts automatically in the background (llama icon near the clock).

2. Download the AI model (about 2 GB, one time). In Command Prompt:
     ollama pull llama3.2:3b

   Slower or older laptop (4 GB RAM)? Use the smaller model instead:
     ollama pull llama3.2:1b
   and set OLLAMA_MODEL=llama3.2:1b in .env (step 5).

3. Open Command Prompt in the Medibot folder and create a virtual environment:
     python -m venv venv
     venv\Scripts\activate

4. Install the Python packages:
     pip install -r requirements.txt

5. Create your settings file:
     copy .env.example .env
   Open .env in Notepad and set SECRET_KEY to a long random string. Generate one with:
     python -c "import secrets; print(secrets.token_hex(32))"
   Nothing else is needed for offline mode.

6. Save the embedding model inside the project (about 90 MB, one time):
     python scripts/download_models.py
   If you have run the old Medibot before, it simply copies the model from
   your Hugging Face cache, with no download. If the download times out, try
   another network (e.g. a mobile hotspot), or download these files manually
   from https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/tree/main
   into the folder models\all-MiniLM-L6-v2\ keeping the same names:
     config.json, config_sentence_transformers.json, modules.json,
     sentence_bert_config.json, special_tokens_map.json, tokenizer.json,
     tokenizer_config.json, vocab.txt, model.safetensors,
     1_Pooling\config.json

From now on, no internet is needed:

7. Check that everything is ready (try it with Wi-Fi off):
     python scripts/check_offline.py

8. Start Medibot:
     venv\Scripts\activate
     python -m app.application
   Open http://127.0.0.1:5000 in your browser, click Register and follow the steps.

The first question takes a little longer while the models load. On a normal
laptop CPU, answers take roughly 5-30 seconds depending on the model and the
computer. If Ollama is not running, Medibot still answers by showing the most
relevant encyclopedia text and disease information (without AI wording).

To copy Medibot to another computer for offline use, copy the whole folder
(including models\ and vectorstore\), install Python, the requirements and
Ollama + the model on that computer.

macOS / Linux: the same steps, but activate with "source venv/bin/activate"
and use "cp .env.example .env".

Optional - use the Groq cloud model instead (needs internet):
     LLM_PROVIDER=groq
     GROQ_API_KEY=your key from https://console.groq.com/keys
     GROQ_MODEL=a current model name from https://console.groq.com/docs/models
   ("model_not_found" usually means the model name was retired or is not
    available to your key: pick a current one from the models page.)


REAL OTP SMS TO EACH USER'S PHONE
---------------------------------
With SMS_PROVIDER=auto (the default), Medibot sends the OTP by real SMS to the
mobile number the user registered with:

  * Indian numbers (+91): Fast2SMS first, then Twilio if Fast2SMS fails.
  * Other countries: Twilio.
  * No keys set, or no internet: the OTP is shown on the screen and in the
    terminal instead, so registration still works offline.

When real SMS works, set SHOW_OTP_ON_SCREEN=false in .env so a code is never
displayed on screen (otherwise anyone could register someone else's number
while the internet is down).

GETTING A FAST2SMS KEY (recommended for India)
  1. Go to https://www.fast2sms.com and click Sign Up. Register with your
     mobile number and verify it.
  2. Log in to the dashboard and open "Dev API" (or "API Keys") in the menu.
  3. Copy your API Authorization Key.
  4. Add money to the wallet (Recharge). Sending SMS through the API needs a
     paid balance; the minimum recharge is small (check their pricing page).
  5. In .env set:
        SMS_PROVIDER=auto
        FAST2SMS_API_KEY=paste_your_key_here
        FAST2SMS_ROUTE=q
     "q" (Quick SMS) sends Medibot's own message and works right after a
     recharge. "otp" uses Fast2SMS's OTP route, which is cheaper but needs
     you to complete the website/OTP verification shown in their dashboard.
  6. Restart Medibot and register with your own number to test.
  If it fails, the reason is in the terminal and in logs\ (for example
  "insufficient balance" or "invalid authentication").

GETTING TWILIO KEYS (any country)
  1. Sign up at https://www.twilio.com/try-twilio and verify your email and
     your own mobile number. You get free trial credit.
  2. On the Console home page (https://console.twilio.com) copy the
     "Account SID" and "Auth Token".
  3. Click "Get a phone number" (Phone Numbers > Manage > Buy a number) to get
     a Twilio number that can send SMS. Copy it in +1XXXXXXXXXX format.
  4. In .env set:
        TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        TWILIO_AUTH_TOKEN=your_auth_token
        TWILIO_FROM_NUMBER=+1XXXXXXXXXX
  5. Restart Medibot.
  Note: a Twilio TRIAL account can only send SMS to numbers you have verified
  in the Twilio console (Phone Numbers > Verified Caller IDs). To send to any
  user's number, upgrade the account (add a payment method). SMS to Indian
  numbers from Twilio may also need Indian DLT sender registration, which is
  why Fast2SMS is tried first for +91 numbers.

You can set both Fast2SMS and Twilio keys; Medibot tries them in order.
To add another provider (MSG91, AWS SNS, ...), add a class in app/auth/sms.py.

Numbers can be typed as 9876543210 or +919876543210. Numbers without a "+"
get DEFAULT_COUNTRY_CODE (default +91).

OTP rules (all configurable in .env): 6 digits, valid for 5 minutes, 5 wrong
attempts allowed, 60 seconds between resends, at most 5 codes per hour per number.
OTP codes are stored only as a hash, never in plain text.


REGISTRATION AND LOGIN FLOW
---------------------------
  Register  -> enter name, mobile number, password  -> OTP is sent
  Verify    -> enter the OTP -> "Registration successful"
  Log in    -> mobile number + password (any time later)
  Forgot password -> OTP to your mobile -> choose a new password

Passwords need at least 8 characters with a letter and a number, and are stored
as salted hashes (werkzeug). After 5 wrong passwords the account is locked for
15 minutes.


DISEASE DATABASE
----------------
database/diseases.db is already built. To rebuild it (for example after adding
more volumes of the encyclopedia to Data/):

     python scripts/build_disease_db.py

For each disease it stores: definition, description, causes and symptoms, a
short list of common symptoms, diagnosis, treatment, alternative treatment
(remedies), prognosis, prevention, and the source PDF page.

NOTE: the PDF in Data/ is Volume 2 of the encyclopedia (letters C to F), so the
database currently covers diseases from C to F (203 entries). Put the other
volumes (A-B, G-M, N-S, T-Z) in Data/ and re-run the script to cover everything,
then rebuild the chatbot index too (see below).

The extraction is automatic, so a few entries can contain small artefacts from
the PDF layout.


REBUILDING THE CHATBOT INDEX (after changing the PDFs)
--------------------------------------------------------
     python -m app.components.data_loader


PAGES AND API
-------------
  /                     chat (login required)
  /diseases             disease library with search and A-Z
  /diseases/<name>      disease details (symptoms, treatment, remedies, prevention)
  /symptom-checker      enter symptoms, see matching conditions (educational only)
  /about                about Medibot
  /health               status check (JSON): offline mode, AI model, SMS mode
  POST /api/chat        {"question": "..."}  -> answer, sources, related diseases
  GET  /api/history     your chat history
  GET  /api/diseases?q= search diseases
  GET  /api/diseases/<slug>  one disease as JSON
  (API calls need you to be logged in; POST calls need the X-CSRF-Token header
   from the page's <meta name="csrf-token">.)


RUNNING THE TESTS
-----------------
     pytest -q

The tests use a temporary database and fake SMS/AI, so they need no API keys,
no internet and no Ollama.


DEPLOYING
---------
Do not use the built-in Flask server in production. Use:

     gunicorn -w 2 --timeout 120 -b 0.0.0.0:5000 "app.application:app"   (Linux/macOS)
     waitress-serve --port=5000 app.application:app                      (Windows)

or Docker:

     docker build -t medibot .
     docker run -p 5000:5000 --env-file .env medibot
   (Ollama keeps running on the host; the container reaches it at
    host.docker.internal:11434. Run download_models.py before building.)

Serve it over HTTPS (for example behind Nginx or a hosting platform) and set
SESSION_COOKIE_SECURE=true. Use real SMS keys and SHOW_OTP_ON_SCREEN=false.


SECURITY NOTES
--------------
  * Never share or zip your .env file. It contains your API keys.
    (The old project zip contained a real Groq key: please rotate it at
    https://console.groq.com/keys if you shared that zip.)
  * Do not put your virtual environment (squirtle/, venv/) in zips or git.
  * Only load FAISS indexes you built yourself (they are pickle files).


WHAT CHANGED IN VERSION 2.0
---------------------------
Bug fixes from version 1:
  1. The home page crashed on every visit (user_input used before it was set).
  2. The prompt template was passed as a function, not a PromptTemplate.
  3. DATA_PATH was "data/" but the folder is "Data/" (broke on Linux).
  4. logger.Warning typo in vector_store.py.
  5. Chat output was rendered with "| safe" (allowed HTML/script injection, XSS).
  6. A random secret key logged everyone out on each restart.
  7. Chat history in the cookie broke after ~4 KB; it is now in the database.
  8. The embedding model, index and LLM were reloaded on every message; now once.
  9. Paths were relative to the current folder; now relative to the project.

New features you asked for:
  10. Registration with mobile number + OTP verification by SMS.
  11. Login with mobile number + password, logout, "keep me logged in".
  12. A disease database (symptoms, treatments, remedies, prevention) built
      from the encyclopedia, with an extraction script to rebuild it.
  13. readme.txt (this file).

Extra improvements:
  14. Forgot-password flow with OTP.
  15. Security: hashed passwords and OTPs, CSRF protection on every form,
      account lockout after failed logins, OTP rate limits, safe redirects,
      HttpOnly/SameSite cookies, security headers, no number enumeration.
  16. Pluggable SMS providers (console, Twilio, Fast2SMS) configured in .env.
  17. Answers show their sources (PDF page + snippet).
  18. The bot remembers the conversation, so follow-ups like
      "how is it treated?" work (question is rewritten using chat history).
  19. Better answers: 4 chunks retrieved instead of 1, temperature 0.2,
      600 max tokens, and an "I could not find it" rule instead of guessing.
  20. The chatbot looks up diseases you mention in the disease database, adds
      their facts to the answer, and links to their library page.
  21. Disease Library page with search (by name or symptom) and A-Z filter.
  22. Symptom Checker page (keyword match, clearly labelled as not a diagnosis).
  23. Emergency detection: questions about chest pain, stroke, overdose,
      suicide, etc. show an emergency/helpline notice.
  24. Medical disclaimer on every page.
  25. New responsive UI with dark mode, typing indicator, Enter-to-send,
      suggested questions, and no page reload when chatting.
  26. JSON API (/api/chat, /api/history, /api/diseases) for a future mobile app.
  27. All settings in .env (.env.example provided).
  28. Logging to console and to logs/ (no duplicated handlers).
  29. /health status endpoint and friendly error pages.
  30. 16 automated tests (pytest).
  31. Dockerfile, gunicorn/waitress, .gitignore, pinned requirements.txt.

WHAT CHANGED IN VERSION 2.1 (offline edition)
---------------------------------------------
  32. Runs fully offline: the default AI model is now a local Llama 3.2 model
      through Ollama (LLM_PROVIDER=ollama). Groq is still available as an
      option (LLM_PROVIDER=groq, model name configurable with GROQ_MODEL).
  33. OFFLINE_MODE (on by default) stops all Hugging Face network access, which
      fixes the download time-outs when starting the app.
  34. The embedding model is stored inside the project (models/), created once
      by scripts/download_models.py (copies from the local cache if present).
  35. scripts/check_offline.py: a self-check for demos (works with Wi-Fi off).
  36. If the AI model is not running, the chatbot still answers with the most
      relevant encyclopedia text and disease facts instead of an error.
  37. Faster on laptops: follow-up rewriting only runs for short questions.
  38. Real OTP SMS to each user's own phone: SMS_PROVIDER=auto tries Fast2SMS
      (India) first, then Twilio, using whichever keys are in .env.
  39. Automatic offline fallback for OTP: with no keys or no internet, the code
      is shown on the verify page (and terminal), so registration still works.
      SHOW_OTP_ON_SCREEN=false turns this off for real deployments.
  40. Fast2SMS now supports the Quick SMS route ("q", works right after a
      recharge) as well as the OTP route.
  41. About page and /health show the AI model, offline mode and SMS mode.
  42. Step-by-step Windows offline setup, Fast2SMS and Twilio key guides, and
      a "Why offline?" explanation in this readme.
  43. 5 new tests (21 in total).

WHAT CHANGED IN VERSION 3.0 (app edition)
-----------------------------------------
  44. New Medibot app in mobile/: installs on Android (APK), on PCs (Windows/
      Mac/Linux, as an installable app) and on iPhones (Add to Home Screen).
  45. Fully on-device: login with mobile number + password, OTP, chat,
      disease library, symptom checker, chat history. No server needed.
  46. On-device encyclopedia search (BM25 over 5,169 passages from all 759
      PDF pages) with page numbers, plus offline answers built from it.
  47. Online and offline modes switch automatically (status badge at the top):
      Groq AI and real SMS when online; on-device answers and on-screen OTP
      when offline; optional laptop AI (Ollama) over Wi-Fi with no internet.
  48. Groq model picker in Settings ("Test key and load models"), fixing
      model_not_found errors.
  49. Free cloud build of the APK with GitHub Actions, and a second workflow
      that publishes the app to GitHub Pages for PC/iPhone.
  50. App icon, splash screen, mobile bottom navigation, dark mode.
  51. scripts/build_mobile_data.py exports the encyclopedia and disease
      library for the app; 3 new tests (24 in total).
