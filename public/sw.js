// Service worker do Orbi: recebe o aviso de mensagem nova (Web Push) e abre a conversa ao tocar.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { corpo: e.data ? e.data.text() : '' } }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Nova mensagem', {
    body: d.corpo || '',
    icon: '/brand/icon-192.png',
    badge: '/brand/icon-192.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: d.url || '/dashboard/conversas' },
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = new URL((e.notification.data && e.notification.data.url) || '/dashboard/conversas', self.location.origin).href
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of abertas) {
      if (new URL(c.url).origin === self.location.origin && 'focus' in c) {
        try { if ('navigate' in c) await c.navigate(url) } catch { /* aba não controlada: só foca */ }
        return c.focus()
      }
    }
    return self.clients.openWindow(url)
  })())
})
