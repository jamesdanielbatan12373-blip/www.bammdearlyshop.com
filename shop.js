const $ = (id) => document.getElementById(id);
let PRICE_PHP = 99;
const fields = ['crushName','yourName','opening','confession','question','yesText','noText','theme','startButton','flowerAfter','yesTitle','yesMessage','noTitle','noMessage'];
let musicData = '';
let paidOrder = '';

function renderPrice(){ $('priceLabel').textContent = `₱${PRICE_PHP}`; $('payBtn').textContent = `Pay with GCash · ₱${PRICE_PHP}`; }
fetch('/api/config').then(r=>r.json()).then(data=>{ if(Number.isFinite(Number(data.pricePhp))) PRICE_PHP=Number(data.pricePhp); renderPrice(); }).catch(()=>renderPrice());

function getConfig(){
  const cfg = {};
  fields.forEach(id => cfg[id] = $(id).value);
  if (musicData) cfg.musicData = musicData;
  return cfg;
}
function saveDraft(){
  localStorage.setItem('dearlyDraft', JSON.stringify(getConfig()));
}
function updatePreview(){
  saveDraft();
  const frame = $('preview');
  // Reloading the isolated preview applies the saved configuration before its script runs.
  frame.src = './preview.html?preview=' + Date.now();
}
fields.forEach(id => $(id).addEventListener('input', updatePreview));
$('musicFile').addEventListener('change', () => {
  const file = $('musicFile').files[0];
  if (!file) { musicData = ''; updatePreview(); return; }
  if (!file.type.startsWith('audio/')) { alert('Please choose an audio file.'); return; }
  const reader = new FileReader();
  reader.onload = () => { musicData = reader.result; updatePreview(); };
  reader.readAsDataURL(file);
});

async function fetchDataUrl(url){
  const res = await fetch(url); if (!res.ok) throw new Error('Could not load the included music file.');
  const blob = await res.blob();
  return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
}

$('payBtn').addEventListener('click', async () => {
  const name = $('buyerName').value.trim();
  const email = $('buyerEmail').value.trim();
  if (!name || !email || !$('buyerEmail').checkValidity()) {
    $('status').textContent = 'Please enter your name and a valid email address first.';
    return;
  }
  $('payBtn').disabled = true;
  $('status').textContent = 'Creating your secure GCash checkout…';
  try {
    saveDraft();
    const response = await fetch('/api/create-checkout', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name,email})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not start checkout.');
    sessionStorage.setItem('dearlyOrder', data.reference);
    window.location.href = data.checkoutUrl;
  } catch (err) {
    $('status').textContent = err.message;
    $('payBtn').disabled = false;
  }
});

async function checkOrder(reference){
  const status = $('status');
  try {
    const res = await fetch('/api/order/' + encodeURIComponent(reference));
    const data = await res.json();
    if (res.ok && data.status === 'paid') {
      paidOrder = reference;
      status.textContent = 'Payment confirmed. Your customized website is ready.';
      $('downloadBtn').style.display = 'block';
      $('payBtn').style.display = 'none';
      return true;
    }
    status.textContent = 'Waiting for PayMongo to confirm your GCash payment. This can take a moment.';
  } catch (_) { status.textContent = 'Could not verify payment yet. Refresh this page in a moment.'; }
  return false;
}

$('downloadBtn').addEventListener('click', async () => {
  if (!paidOrder) return;
  $('downloadBtn').disabled = true;
  $('downloadBtn').textContent = 'Preparing your website…';
  try {
    const cfg = getConfig();
    if (!cfg.musicData) cfg.musicData = await fetchDataUrl('/music.mp3');
    const [css, js, html] = await Promise.all([
      fetch('/style.css').then(r=>r.text()),
      fetch('/preview.js').then(r=>r.text()),
      fetch('/preview-original.html').then(r=>r.text())
    ]);
    const embedded = html
      .replace('<link rel="stylesheet" href="style.css">', `<style>\n${css}\n</style>`)
      .replace('<source src="music.mp3" type="audio/mpeg">', `<source src="${cfg.musicData}" type="audio/mpeg">`)
      .replace('<script src="preview.js"></script>', `<script>window.DEARLY_CONFIG=${JSON.stringify(cfg).replace(/</g,'\\u003c')};<\/script><script>\n${js}\n<\/script>`);
    const blob = new Blob([embedded], {type:'text/html;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='my-dearly-confession.html'; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    $('downloadBtn').textContent = 'Download again';
    $('downloadBtn').disabled = false;
  } catch (err) {
    $('status').textContent = 'Could not prepare the download: ' + err.message;
    $('downloadBtn').disabled = false;
  }
});

const params = new URLSearchParams(location.search);
const orderFromUrl = params.get('order') || sessionStorage.getItem('dearlyOrder');
if (params.get('paid') === '1' && orderFromUrl) {
  $('status').textContent = 'Checking your payment with PayMongo…';
  let attempts = 0;
  const timer = setInterval(async () => {
    attempts++;
    const done = await checkOrder(orderFromUrl);
    if (done || attempts >= 30) clearInterval(timer);
  }, 3000);
}
updatePreview();
