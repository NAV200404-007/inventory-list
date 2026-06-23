import type { SupabaseClient } from '@supabase/supabase-js'

export const VAPID_PUBLIC_KEY = 'BPGdYk4bB9iIv7vPKUbHHna638R6T6H8TS81IZI0Tmvs8qGdxH7eV_x6q1GKSeWxIsJZN4Yr4MevS5Syf9hTlWg'

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)))
}

export function supportsPushNotifications() {
  return import.meta.env.PROD && window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function hasActivePushSubscription(client: SupabaseClient, userId: string) {
  if (!supportsPushNotifications()) return false
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return false
  const { data, error } = await client
    .from('push_subscriptions')
    .select('endpoint')
    .eq('endpoint', subscription.endpoint)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function enablePushNotifications(client: SupabaseClient, userId: string) {
  if (!supportsPushNotifications()) throw new Error('Push notifications are not supported on this device.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  let subscription = existing
  if (existing) {
    const { data, error } = await client
      .from('push_subscriptions')
      .select('endpoint')
      .eq('endpoint', existing.endpoint)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!data) {
      await existing.unsubscribe()
      subscription = null
    }
  }
  subscription = subscription ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error('The browser returned an incomplete push subscription.')
  }

  const { error } = await client.from('push_subscriptions').upsert({
    endpoint: json.endpoint,
    user_id: userId,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_agent: navigator.userAgent,
  }, { onConflict: 'endpoint' })
  if (error) {
    if (/row.level security/i.test(error.message)) {
      throw new Error('This device was linked to another account. Its old subscription was reset; tap Turn on once more.')
    }
    throw error
  }
}

export async function disablePushNotifications(client: SupabaseClient) {
  if (!supportsPushNotifications()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  const endpoint = subscription.endpoint
  const { error } = await client.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) throw error
  await subscription.unsubscribe()
}
