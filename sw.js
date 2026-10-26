/* مُهر: ذخیره‌ی خود صفحه برای باز شدن بدون اینترنت. درخواست‌های سرور (Supabase) هرگز ذخیره نمی‌شوند. */
var CACHE='mohr-page-v1';
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',function(e){
  var req=e.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin)return;
  e.respondWith(
    fetch(req).then(function(res){
      if(res&&res.ok){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy)})}
      return res;
    }).catch(function(){
      return caches.match(req,{ignoreSearch:true}).then(function(hit){return hit||caches.match('./',{ignoreSearch:true})||caches.match('index.html',{ignoreSearch:true})});
    })
  );
});
