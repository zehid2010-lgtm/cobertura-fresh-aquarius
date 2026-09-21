const DATA_SOURCE = "./fresh-aquarius.json";

const PRODUCTS = {
  fresh15: { label: "Cepita Fresh 1,5 L PET", short: "Fresh 1,5 L", family: "fresh" },
  fresh3: { label: "Cepita Fresh 3 L PET", short: "Fresh 3 L", family: "fresh" },
  aquariusAny: { label: "Aquarius · cualquier presentación", short: "Aquarius total", family: "aquarius" },
  aq15: { label: "Aquarius 1,5 L PET", short: "1,5 L PET", family: "aquarius" },
  aq225: { label: "Aquarius 2,25 L PET", short: "2,25 L PET", family: "aquarius" },
  aq25ret: { label: "Aquarius 2,5 L Ret PET", short: "2,5 L Ret", family: "aquarius" },
  aq375: { label: "Aquarius 375 ml PET", short: "375 ml", family: "aquarius" },
  aq500nr: { label: "Aquarius 500 ml NR PET", short: "500 ml NR", family: "aquarius" },
  aq500ret: { label: "Aquarius 500 ml Ret", short: "500 ml Ret", family: "aquarius" }
};

const AQUARIUS_KEYS = ["aq15","aq225","aq25ret","aq375","aq500nr","aq500ret"];
const BIT = { fresh15:1, fresh3:2, aq15:4, aq225:8, aq25ret:16, aq375:32, aq500nr:64, aq500ret:128 };

const state = {
  data: null,
  route: "ALL",
  product: "fresh15",
  status: "ALL",
  search: ""
};

const $ = (id) => document.getElementById(id);

function asBool(v){
  return v === true || v === 1 || v === "1";
}

function normalizeClient(raw){
  if (Array.isArray(raw)){
    const [route, clientId, client, channel, maskRaw] = raw;
    const mask = Number(maskRaw || 0);
    const p = {};
    Object.entries(BIT).forEach(([k,b]) => p[k] = Boolean(mask & b));
    return { route:String(route||""), clientId:String(clientId||""), client:String(client||""), channel:String(channel||""), p };
  }
  const src = raw.p || raw.products || {};
  const p = {};
  Object.keys(BIT).forEach(k => p[k] = asBool(src[k] ?? raw[k]));
  return {
    route:String(raw.route ?? raw.r ?? ""),
    clientId:String(raw.clientId ?? raw.outnum ?? raw.id ?? ""),
    client:String(raw.client ?? raw.name ?? raw.razonSocial ?? ""),
    channel:String(raw.channel ?? raw.canal ?? ""),
    p
  };
}

function isBuyer(client,key){
  if (key === "aquariusAny") return AQUARIUS_KEYS.some(k => client.p[k]);
  return Boolean(client.p[key]);
}

function routeClients(){
  const all = state.data?.clients || [];
  return state.route === "ALL" ? all : all.filter(c => c.route === state.route);
}

function metric(clients,key){
  const total = clients.length;
  const buyers = clients.reduce((n,c) => n + (isBuyer(c,key) ? 1 : 0),0);
  const pct = total ? (buyers / total) * 100 : 0;
  return { total, buyers, pct };
}

function pctText(n){
  return `${n.toLocaleString("es-AR",{minimumFractionDigits:1,maximumFractionDigits:1})}%`;
}

function renderMetricCard(container,key,kicker){
  const clients = routeClients();
  const m = metric(clients,key);
  const tpl = $("metricTemplate").content.cloneNode(true);
  const card = tpl.querySelector(".metric-card");
  card.classList.add(PRODUCTS[key].family);
  card.dataset.product = key;
  card.tabIndex = 0;
  card.setAttribute("role","button");
  card.setAttribute("aria-label",`Ver clientes de ${PRODUCTS[key].label}`);
  tpl.querySelector(".metric-kicker").textContent = kicker;
  tpl.querySelector("h3").textContent = PRODUCTS[key].label;
  tpl.querySelector(".metric-percent").textContent = pctText(m.pct);
  tpl.querySelector(".progress span").style.width = `${Math.min(100,m.pct)}%`;
  tpl.querySelector(".metric-buyers").textContent = `${m.buyers} compradores`;
  tpl.querySelector(".metric-total").textContent = `de ${m.total}`;
  card.addEventListener("click",() => selectProduct(key));
  card.addEventListener("keydown",(e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectProduct(key); }
  });
  container.appendChild(tpl);
}

function renderMain(){
  const clients = routeClients();
  $("scopeText").textContent = state.route === "ALL" ? "Todas las rutas" : `Ruta ${state.route}`;
  $("clientTotal").textContent = `${clients.length} clientes`;

  const main = $("mainCards");
  main.innerHTML = "";
  renderMetricCard(main,"fresh15","CEPITA FRESH");
  renderMetricCard(main,"fresh3","CEPITA FRESH");
  renderMetricCard(main,"aquariusAny","AQUARIUS");

  const aq = $("aquariusCards");
  aq.innerHTML = "";
  AQUARIUS_KEYS.forEach(key => {
    const m = metric(clients,key);
    const card = document.createElement("article");
    card.className = "presentation-card";
    card.innerHTML = `
      <div class="name">${PRODUCTS[key].label}</div>
      <div class="line">
        <div><strong>${pctText(m.pct)}</strong><br><small>${m.buyers} de ${m.total}</small></div>
      </div>`;
    card.addEventListener("click",() => selectProduct(key));
    aq.appendChild(card);
  });
}

function selectProduct(key){
  state.product = key;
  $("productSelect").value = key;
  renderClients();
  document.querySelector(".clients-section")?.scrollIntoView({behavior:"smooth",block:"start"});
}

function filteredClients(){
  const q = state.search.trim().toLocaleLowerCase("es");
  let clients = routeClients().filter(c => {
    if (!q) return true;
    return c.client.toLocaleLowerCase("es").includes(q) || c.clientId.toLocaleLowerCase("es").includes(q);
  });

  if (state.status === "BUYER") clients = clients.filter(c => isBuyer(c,state.product));
  if (state.status === "PENDING") clients = clients.filter(c => !isBuyer(c,state.product));

  return clients.sort((a,b) => {
    const ap = isBuyer(a,state.product) ? 1 : 0;
    const bp = isBuyer(b,state.product) ? 1 : 0;
    if (ap !== bp) return ap - bp;
    return a.client.localeCompare(b.client,"es",{sensitivity:"base"});
  });
}

function renderClients(){
  const clients = filteredClients();
  const base = routeClients();
  const buyers = base.filter(c => isBuyer(c,state.product)).length;
  const pending = base.length - buyers;

  $("listSummary").innerHTML = `
    <span><strong>${PRODUCTS[state.product].label}</strong></span>
    <span>${buyers} compradores · ${pending} pendientes</span>`;

  const list = $("clientList");
  list.innerHTML = "";
  if (!clients.length){
    list.innerHTML = '<div class="empty">No hay clientes que coincidan con los filtros seleccionados.</div>';
    return;
  }

  clients.forEach(c => {
    const buyer = isBuyer(c,state.product);
    const row = document.createElement("article");
    row.className = `client-row ${buyer ? "buyer" : "pending"}`;
    row.innerHTML = `
      <div>
        <div class="client-name">${escapeHtml(c.client || "Sin razón social")}</div>
        <div class="client-meta">
          <span class="meta-pill">Ruta ${escapeHtml(c.route)}</span>
          <span class="meta-pill">${escapeHtml(c.clientId)}</span>
          ${c.channel ? `<span class="meta-pill">${escapeHtml(c.channel)}</span>` : ""}
        </div>
      </div>
      <div class="status ${buyer ? "ok" : "no"}">${buyer ? "COMPRADOR" : "PENDIENTE"}</div>`;
    list.appendChild(row);
  });
}

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

function formatUpdated(value){
  if (!value) return "Sin fecha";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-AR",{
    day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"
  }).format(d);
}

function renderHeader(){
  $("updatedAt").textContent = formatUpdated(state.data.updatedAt);
  const badge = $("sourceBadge");
  const demo = String(state.data.source || "").toLowerCase() === "demo";
  badge.textContent = demo ? "DATOS DE PRUEBA" : "DATOS ACTUALIZADOS";
  if (demo){
    const note = document.createElement("div");
    note.className = "demo-note";
    note.textContent = "Vista inicial con clientes ficticios. La automatización real se conectará después.";
    document.querySelector("main").prepend(note);
  }
}

function renderAll(){
  renderHeader();
  renderMain();
  renderClients();
}

async function load(){
  try{
    const res = await fetch(`${DATA_SOURCE}?t=${Date.now()}`,{cache:"no-store"});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    state.data = {
      ...raw,
      clients:(raw.clients || raw.c || []).map(normalizeClient)
    };
    renderAll();
  }catch(err){
    console.error(err);
    document.querySelector("main").innerHTML = `
      <div class="empty">
        <strong>No se pudieron cargar los datos.</strong><br>
        Revisá el archivo fresh-aquarius.json o volvé a actualizar la página.
      </div>`;
    $("sourceBadge").textContent = "ERROR DE DATOS";
  }
}

$("routeSelect").addEventListener("change",(e) => {
  state.route = e.target.value;
  renderMain();
  renderClients();
});
$("productSelect").addEventListener("change",(e) => {
  state.product = e.target.value;
  renderClients();
});
$("searchInput").addEventListener("input",(e) => {
  state.search = e.target.value;
  renderClients();
});
document.querySelectorAll(".seg").forEach(btn => {
  btn.addEventListener("click",() => {
    document.querySelectorAll(".seg").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    state.status = btn.dataset.status;
    renderClients();
  });
});

if ("serviceWorker" in navigator){
  window.addEventListener("load",() => navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
load();