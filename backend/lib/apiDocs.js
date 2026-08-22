/**
 * lib/apiDocs.js — the interactive API console served at /v1/docs
 *
 * Deliberately self-contained: no CDN scripts, no external stylesheets. It has
 * to work on a conference wifi that blocks half the internet, and it has to
 * work when someone opens it from a laptop with no network beyond the host.
 *
 * Every endpoint has a live "Send" button that performs the real request, so a
 * reader can confirm the API works rather than taking the page's word for it.
 */

const ENDPOINTS = [
  {
    method: "GET",
    path: "/v1/surveillance/states",
    tag: "surveillance",
    summary: "National signal, one row per state",
    detail:
      "Every monitored state with outbreak, reach, soil and water metrics, plus national totals. Start here.",
  },
  {
    method: "GET",
    path: "/v1/surveillance/districts?state=PB",
    tag: "surveillance",
    summary: "District signal for one state",
    detail:
      "All districts in the requested state with pressure index, dominant threat and a 14-day trajectory.",
  },
  {
    method: "GET",
    path: "/v1/surveillance/alerts?state=PB",
    tag: "surveillance",
    summary: "Open escalations",
    detail:
      "Districts that crossed an escalation rule. Each alert carries the rule that fired it, so it can be explained rather than merely displayed. Drop the parameter for the national queue.",
  },
  {
    method: "GET",
    path: "/v1/models",
    tag: "models",
    summary: "Advisory model registry",
    detail:
      "Every advisory model a state has published, with its adoption and field-validation record.",
  },
  {
    method: "GET",
    path: "/v1/models/kai.pb.wheat-yellow-rust",
    tag: "models",
    summary: "A single model card artefact",
    detail:
      "The artefact another state consumes in order to adopt this model. This is what travels between states.",
  },
  {
    method: "GET",
    path: "/v1/knowledge",
    tag: "knowledge",
    summary: "Advisory corpus manifest",
    detail:
      "What the advisory system is allowed to know, with the provenance of every document. Nothing outside this corpus can be used to answer.",
  },
  {
    method: "GET",
    path: "/v1/knowledge/search?q=yellow%20stripes%20on%20wheat%20leaves",
    tag: "knowledge",
    summary: "Retrieval over the corpus",
    detail:
      "BM25 lexical search. Each result carries the query terms that matched it, so relevance is inspectable rather than an opaque similarity score.",
  },
  {
    method: "POST",
    path: "/v1/advisory",
    tag: "knowledge",
    summary: "Grounded advisory with citations",
    detail:
      "Answers strictly from retrieved passages. If the corpus cannot support an answer the request is refused before any model call, and the gate that made that decision is returned with it. Try the refusal by asking something outside agriculture.",
    body: { question: "My wheat has yellow stripes on the leaves" },
  },
  {
    method: "GET",
    path: "/v1/openapi.json",
    tag: "meta",
    summary: "OpenAPI 3.0 specification",
    detail:
      "Feed this to Postman or an SDK generator to produce a working client with no involvement from us.",
  },
];

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function renderDocs(origin) {
  const rows = ENDPOINTS.map(
    (e, i) => `
    <article class="ep">
      <div class="ep-head">
        <span class="method" data-m="${e.method}">${e.method}</span>
        <code class="path">${esc(e.path)}</code>
        <span class="tag tag-${e.tag}">${e.tag}</span>
        <button class="send" data-path="${esc(e.path)}" data-i="${i}" data-method="${e.method}">Send</button>
      </div>
      <h3>${esc(e.summary)}</h3>
      <p>${esc(e.detail)}</p>
      ${
        e.body
          ? `<textarea class="body-input" id="in-${i}" rows="3">${esc(JSON.stringify(e.body, null, 2))}</textarea>
             <pre class="curl">curl -X POST ${origin}${esc(e.path)} \
  -H "Content-Type: application/json" \
  -d '${esc(JSON.stringify(e.body))}'</pre>`
          : `<pre class="curl">curl ${origin}${esc(e.path)}</pre>`
      }
      <div class="out" id="out-${i}" hidden><div class="out-bar"><span class="status"></span><span class="ms"></span></div><pre class="body"></pre></div>
    </article>`,
  ).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agricultural Signal API — Kisan AI</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#FDFCF8;color:#5B532C;
       font:15px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  .wrap{max-width:920px;margin:0 auto;padding:48px 20px 80px}
  header{border-bottom:1px solid rgba(91,83,44,.12);padding-bottom:28px;margin-bottom:28px}
  .eyebrow{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#63A361}
  h1{font-size:34px;line-height:1.15;margin:12px 0 10px;font-weight:700}
  h1 span{color:#63A361}
  .lede{color:rgba(91,83,44,.65);max-width:60ch;margin:0}
  .pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
  .pill{font-size:12px;font-weight:600;padding:6px 12px;border-radius:999px;
        background:rgba(99,163,97,.12);color:#4A8A4D}
  .pill.warn{background:rgba(255,197,15,.18);color:#A57D00}
  .note{display:flex;gap:14px;padding:16px 18px;border-radius:16px;
        background:rgba(253,231,179,.35);border:1px solid rgba(91,83,44,.1);margin-bottom:32px}
  .note b{display:block;margin-bottom:2px}
  .note p{margin:0;font-size:13.5px;color:rgba(91,83,44,.7)}
  .ep{background:#fff;border:1px solid rgba(91,83,44,.1);border-radius:16px;
      padding:20px;margin-bottom:16px}
  .ep-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .method{font:600 11px/1 ui-monospace,monospace;letter-spacing:.06em;
          background:#63A361;color:#fff;padding:6px 9px;border-radius:6px}
  .ep-head .method[data-m="POST"]{background:#EF8A3C}
  .path{font:13px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#5B532C;
        background:rgba(253,231,179,.4);padding:7px 10px;border-radius:8px}
  .tag{font-size:11px;font-weight:600;padding:4px 9px;border-radius:999px;
       background:rgba(91,83,44,.08);color:rgba(91,83,44,.6)}
  .body-input{width:100%;margin-top:14px;padding:11px 13px;border-radius:10px;
              border:1px solid rgba(91,83,44,.15);background:#fff;resize:vertical;
              font:12px/1.5 ui-monospace,monospace;color:rgba(91,83,44,.85)}
  .body-input:focus{outline:none;border-color:rgba(99,163,97,.5)}
  .send{margin-left:auto;font:600 12px/1 inherit;color:#fff;background:#63A361;
        border:0;padding:9px 18px;border-radius:999px;cursor:pointer}
  .send:hover{background:#4a8a4d}
  .send:disabled{opacity:.55;cursor:default}
  h3{font-size:15px;margin:14px 0 4px;font-weight:700}
  .ep p{margin:0;font-size:13.5px;color:rgba(91,83,44,.65)}
  .curl{font:12px/1.5 ui-monospace,monospace;background:#FDFCF8;
        border:1px solid rgba(91,83,44,.1);border-radius:10px;padding:11px 13px;
        margin:14px 0 0;overflow-x:auto;color:rgba(91,83,44,.75)}
  .out{margin-top:12px;border:1px solid rgba(91,83,44,.12);border-radius:10px;overflow:hidden}
  .out-bar{display:flex;gap:12px;align-items:center;padding:8px 13px;
           background:rgba(99,163,97,.08);font:600 12px/1 inherit}
  .status.ok{color:#4A8A4D}.status.err{color:#B3332E}
  .ms{color:rgba(91,83,44,.5);font-weight:500}
  .body{margin:0;padding:14px;max-height:340px;overflow:auto;background:#fff;
        font:12px/1.55 ui-monospace,monospace;color:rgba(91,83,44,.85)}
  footer{margin-top:36px;padding-top:22px;border-top:1px solid rgba(91,83,44,.12);
         font-size:13px;color:rgba(91,83,44,.55)}
  a{color:#4A8A4D}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <span class="eyebrow">Digital Public Good</span>
    <h1>Agricultural <span>Signal API</span></h1>
    <p class="lede">Open crop-health surveillance and cross-state advisory model
      exchange for India. No authentication, no API key, no SDK — any state
      department, researcher or application can call these endpoints directly.</p>
    <div class="pills">
      <span class="pill">CC-BY 4.0</span>
      <span class="pill">No auth required</span>
      <span class="pill">OpenAPI 3.0</span>
      <span class="pill">agri-signal/v1</span>
      <span class="pill warn">Simulated data</span>
    </div>
  </header>

  <div class="note">
    <div>
      <b>About this data</b>
      <p>District names and agro-climatic zones are real. The metrics are
      currently simulated reference data modelling the shape of the live feed —
      they are not observations from ICAR, ISRO or any government source. The
      response schemas are the stable contract: they do not change when the live
      feed is connected, so anything you build against this keeps working.</p>
    </div>
  </div>

  ${rows}

  <footer>
    Kisan AI — Agricultural Signal API v1.0.0 ·
    <a href="/v1/openapi.json">OpenAPI specification</a> ·
    <a href="/v1/">service discovery</a>
  </footer>
</div>

<script>
document.querySelectorAll(".send").forEach(function (btn) {
  btn.addEventListener("click", function () {
    var path = btn.dataset.path;
    var out = document.getElementById("out-" + btn.dataset.i);
    var statusEl = out.querySelector(".status");
    var msEl = out.querySelector(".ms");
    var bodyEl = out.querySelector(".body");

    btn.disabled = true;
    btn.textContent = "…";
    var t0 = performance.now();

    var method = btn.dataset.method || "GET";
    var input = document.getElementById("in-" + btn.dataset.i);
    var init = { method: method, headers: { Accept: "application/json" } };
    if (method === "POST") {
      init.headers["Content-Type"] = "application/json";
      init.body = input ? input.value : "{}";
    }

    fetch(path, init)
      .then(function (r) {
        return r.text().then(function (text) {
          var ms = Math.round(performance.now() - t0);
          statusEl.textContent = r.status + " " + r.statusText;
          statusEl.className = "status " + (r.ok ? "ok" : "err");
          msEl.textContent = ms + " ms · " + (text.length / 1024).toFixed(1) + " KB";
          try {
            bodyEl.textContent = JSON.stringify(JSON.parse(text), null, 2);
          } catch (e) {
            bodyEl.textContent = text;
          }
          out.hidden = false;
        });
      })
      .catch(function (err) {
        statusEl.textContent = "Request failed";
        statusEl.className = "status err";
        msEl.textContent = "";
        bodyEl.textContent = String(err);
        out.hidden = false;
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = "Send";
      });
  });
});
</script>
</body>
</html>`;
}
