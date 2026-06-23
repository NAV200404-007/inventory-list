import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type NotificationRow = {
  id: string
  recipient_id: string
  event_id: string | null
  title: string
  message: string
  push_sent_at: string | null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) throw new Error('Missing authorization')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
    const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:inventory@futurereadyacademy.com'

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) throw new Error('Invalid user session')

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const { data: callerProfile, error: profileError } = await admin
      .from('profiles')
      .select('portal')
      .eq('id', userData.user.id)
      .single()
    if (profileError) throw profileError

    const body = await request.json() as { notificationIds?: string[] }
    const notificationIds = [...new Set(body.notificationIds ?? [])].slice(0, 30)
    if (!notificationIds.length) {
      return Response.json({ sent: 0 }, { headers: corsHeaders })
    }

    const { data: notifications, error: notificationError } = await admin
      .from('notifications')
      .select('id,recipient_id,event_id,title,message,push_sent_at')
      .in('id', notificationIds)
      .is('push_sent_at', null)
    if (notificationError) throw notificationError

    webpush.setVapidDetails(subject, publicKey, privateKey)
    let sent = 0

    for (const notification of (notifications ?? []) as NotificationRow[]) {
      let authorized = callerProfile.portal === 'employer'
      if (!authorized && notification.event_id) {
        const [{ data: recipient }, { data: assignment }] = await Promise.all([
          admin.from('profiles').select('portal').eq('id', notification.recipient_id).single(),
          admin.from('event_staff').select('event_id').eq('event_id', notification.event_id).eq('profile_id', userData.user.id).maybeSingle(),
        ])
        authorized = recipient?.portal === 'employer' && Boolean(assignment)
      }
      if (!authorized) continue

      const { data: subscriptions, error: subscriptionError } = await admin
        .from('push_subscriptions')
        .select('endpoint,p256dh,auth')
        .eq('user_id', notification.recipient_id)
      if (subscriptionError) throw subscriptionError

      for (const subscription of subscriptions ?? []) {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            JSON.stringify({
              title: notification.title,
              body: notification.message,
              eventId: notification.event_id,
              url: '/',
            }),
          )
          sent += 1
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode
          if (statusCode === 404 || statusCode === 410) {
            await admin.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
          } else {
            console.error('Push delivery failed', error)
          }
        }
      }

      await admin
        .from('notifications')
        .update({ push_sent_at: new Date().toISOString() })
        .eq('id', notification.id)
    }

    return Response.json({ sent }, { headers: corsHeaders })
  } catch (error) {
    console.error(error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Push dispatch failed' },
      { status: 400, headers: corsHeaders },
    )
  }
})
