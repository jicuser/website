// Notifications only: never cache pages or prayer data.
self.addEventListener('push', event => {
  let value;
  try { value=event.data?.json(); } catch { return; }
  if (!value || typeof value.title!=='string' || typeof value.body!=='string') return;
  event.waitUntil(self.registration.showNotification(value.title.slice(0,100),{
    body:value.body.slice(0,300),tag:String(value.tag||'jic-salah').slice(0,160),
    icon:'/icons/jic-icon-192.png',badge:'/icons/jic-icon-192.png',data:{url:'/prayer-times/reminders'},
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url=new URL('/prayer-times/reminders',self.location.origin).href;
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
    const client=clients.find(item=>item.url===url);
    if(client) return client.focus();
    return self.clients.openWindow(url);
  }));
});
