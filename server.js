const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
function loadEnv(){
  const file = path.join(ROOT,'.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file,'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g,'');
  }
}
loadEnv();
const PORT = Number(process.env.PORT || 3000);
const PRICE_PHP = Number(process.env.PRICE_PHP || 99);
const DATA_DIR = path.join(ROOT,'.data');
fs.mkdirSync(DATA_DIR,{recursive:true});
const ORDERS_FILE = path.join(DATA_DIR,'orders.json');

function readOrders(){ try{return JSON.parse(fs.readFileSync(ORDERS_FILE,'utf8'));}catch{return {};} }
function writeOrders(orders){ fs.writeFileSync(ORDERS_FILE,JSON.stringify(orders,null,2)); }
function sendJson(res,status,data){
  const body=JSON.stringify(data);
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(body);
}
function readBody(req,max=1024*1024){
  return new Promise((resolve,reject)=>{
    const chunks=[];let size=0;
    req.on('data',chunk=>{size+=chunk.length;if(size>max){reject(new Error('Request body too large'));req.destroy();}else chunks.push(chunk);});
    req.on('end',()=>resolve(Buffer.concat(chunks)));
    req.on('error',reject);
  });
}
function verifyPayMongo(raw,header,secret,isLive){
  if(!header||!secret)return false;
  const parts=Object.fromEntries(header.split(',').map(piece=>{const i=piece.indexOf('=');return i<0?[piece.trim(),'']:[piece.slice(0,i).trim(),piece.slice(i+1).trim()];}));
  if(!parts.t)return false;
  const received=isLive?parts.li:parts.te;
  if(!received)return false;
  const expected=crypto.createHmac('sha256',secret).update(`${parts.t}.${raw.toString('utf8')}`).digest('hex');
  const a=Buffer.from(received);const b=Buffer.from(expected);
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
}

const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mp3':'audio/mpeg','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
async function handler(req,res){
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  if(req.method==='POST'&&url.pathname==='/webhooks/paymongo'){
    let raw;
    try{raw=await readBody(req,2*1024*1024);}catch{return sendJson(res,413,{error:'Payload too large'});}
    let event;
    try{event=JSON.parse(raw.toString('utf8'));}catch{return sendJson(res,400,{error:'Invalid JSON'});}
    const live=event?.data?.livemode===true;
    const header=req.headers['paymongo-signature']||req.headers['x-paymongo-signature'];
    if(!verifyPayMongo(raw,header,process.env.PAYMONGO_WEBHOOK_SECRET,live))return sendJson(res,401,{error:'Invalid webhook signature'});
    if(event?.data?.type==='checkout_session.payment.paid'){
      const session=event.data.data;const attrs=session?.attributes||{};
      const reference=attrs.reference_number||attrs.metadata?.order_reference;
      if(reference){const orders=readOrders();if(orders[reference]){orders[reference].status='paid';orders[reference].checkoutSessionId=session.id;orders[reference].paidAt=new Date().toISOString();writeOrders(orders);}}
    }
    return sendJson(res,200,{received:true});
  }

  if(req.method==='POST'&&url.pathname==='/api/create-checkout'){
    let body;
    try{body=JSON.parse((await readBody(req)).toString('utf8'));}catch{return sendJson(res,400,{error:'Please send valid customer details.'});}
    const secretKey=process.env.PAYMONGO_SECRET_KEY;const baseUrl=process.env.BASE_URL;
    if(!secretKey||!baseUrl)return sendJson(res,503,{error:'GCash checkout is not configured yet. The site owner must add PayMongo keys and a public website URL.'});
    const name=String(body?.name||'').trim().slice(0,100);const email=String(body?.email||'').trim().slice(0,180);
    if(!name||!/^\S+@\S+\.\S+$/.test(email))return sendJson(res,400,{error:'Enter your name and a valid email address.'});
    if(!Number.isFinite(PRICE_PHP)||PRICE_PHP<1||PRICE_PHP>100000)return sendJson(res,500,{error:'The website price is not configured correctly.'});
    const reference=`DEARLY-${crypto.randomUUID()}`;const orders=readOrders();
    orders[reference]={reference,name,email,amount:PRICE_PHP,status:'pending',createdAt:new Date().toISOString()};writeOrders(orders);
    try{
      const response=await fetch('https://api.paymongo.com/v2/checkout_sessions',{
        method:'POST',headers:{'Authorization':'Basic '+Buffer.from(`${secretKey}:`).toString('base64'),'Content-Type':'application/json'},
        body:JSON.stringify({data:{attributes:{
          line_items:[{name:'A Special Flower For You — Customized Confession Website',amount:Math.round(PRICE_PHP*100),currency:'PHP',quantity:1}],
          payment_method_types:['gcash'],
          success_url:`${baseUrl}/?paid=1&order=${encodeURIComponent(reference)}`,
          cancel_url:`${baseUrl}/?cancelled=1&order=${encodeURIComponent(reference)}`,
          reference_number:reference,send_email_receipt:true,billing:{name,email},
          metadata:{order_reference:reference,product:'dearly-flower-confession'}
        }}})
      });
      const result=await response.json();
      if(!response.ok){delete orders[reference];writeOrders(orders);console.error('PayMongo error:',JSON.stringify(result));return sendJson(res,502,{error:'PayMongo could not create the checkout. Check that your account and GCash payment method are enabled.'});}
      const checkoutUrl=result?.data?.attributes?.checkout_url;
      if(!checkoutUrl)return sendJson(res,502,{error:'PayMongo did not return a checkout URL.'});
      orders[reference].checkoutSessionId=result.data.id;writeOrders(orders);
      return sendJson(res,200,{checkoutUrl,reference});
    }catch(error){console.error(error);return sendJson(res,502,{error:'Could not connect to PayMongo. Please try again.'});}
  }

  if(req.method==='GET'&&url.pathname==='/api/config')return sendJson(res,200,{pricePhp:PRICE_PHP});
  if(req.method==='GET'&&url.pathname.startsWith('/api/order/')){
    const reference=decodeURIComponent(url.pathname.slice('/api/order/'.length));const order=readOrders()[reference];
    if(!order)return sendJson(res,404,{error:'Order not found'});
    return sendJson(res,200,{reference:order.reference,status:order.status,amount:order.amount});
  }
  if(req.method==='GET'&&url.pathname==='/health')return sendJson(res,200,{ok:true});
  if(req.method!=='GET'&&req.method!=='HEAD')return sendJson(res,405,{error:'Method not allowed'});

  let pathname;
  try{pathname=decodeURIComponent(url.pathname);}catch{return sendJson(res,400,{error:'Bad URL'});}
  if(pathname==='/'||pathname.endsWith('/'))pathname+='index.html';
  const relative=path.normalize(pathname).replace(/^([/\\]|\.\.(?:[/\\]|$))+/, '');
  if(relative.split(/[\\/]/).some(part=>part.startsWith('.')))return sendJson(res,404,{error:'Not found'});
  const file=path.resolve(ROOT,relative);
  if(!file.startsWith(ROOT+path.sep))return sendJson(res,403,{error:'Forbidden'});
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Not found');}
    res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
    if(req.method==='HEAD')return res.end();
    res.end(data);
  });
}
http.createServer((req,res)=>handler(req,res).catch(err=>{console.error(err);if(!res.headersSent)sendJson(res,500,{error:'Server error'});else res.end();})).listen(PORT,()=>console.log(`Dearly is running at http://localhost:${PORT}`));
