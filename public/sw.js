// GUBIA intentionally does not cache pages, API responses or patient data.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GUBIA · Sin conexión</title><body style="font-family:Arial;padding:32px;color:#17312e;background:#f6f8f4"><h1>Necesitas conexión</h1><p>Para proteger tus datos y consultar horarios actualizados, conecta tu dispositivo a internet.</p><button onclick="location.reload()" style="padding:14px 20px">Volver a intentar</button></body></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
});
