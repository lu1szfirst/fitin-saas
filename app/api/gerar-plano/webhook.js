import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const event = req.body
  const email = event.customer?.email || event.email
  const subscriptionId = event.subscription_id || event.id
  const status = event.type || event.status

  if (status === 'subscription.active' || status === 'approved' || status === 'active') {
    let { data: user } = await supabase
      .from('users').select('id').eq('email', email).single()

    if (!user) {
      const { data: newUser } = await supabase
        .from('users').insert({ email }).select().single()
      user = newUser
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    await supabase.from('subscriptions').upsert({
      user_id: user.id,
      status: 'active',
      invictus_subscription_id: String(subscriptionId),
      expires_at: expiresAt.toISOString()
    }, { onConflict: 'invictus_subscription_id' })
  }

  if (status === 'cancelled' || status === 'expired') {
    await supabase.from('subscriptions')
      .update({ status: 'inactive' })
      .eq('invictus_subscription_id', String(subscriptionId))
  }

  res.status(200).json({ ok: true })
}