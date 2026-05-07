import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const TELEGRAM_BOT_TOKEN = "8057725957:AAHTq11nuL7JPjz_t-7OsuvZvfZIVDeEYGU"

const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  try {
    const body = await req.json()

    // 1. Handle Messages (Registration)
    if (body.message) {
      const text = body.message.text || ""
      const chatId = body.message.chat.id
      const telegramId = body.message.from.id.toString()
      const firstName = body.message.from.first_name

      // Check if it's a registration command: /start_username
      if (text.startsWith("/start_")) {
        const username = text.split("_")[1]?.trim()
        if (username) {
          const { data: subAdmin, error } = await supabase
            .from('sub_admins')
            .update({ telegram_id: telegramId })
            .eq('username', username)
            .select()
            .single()

          if (error || !subAdmin) {
            await sendTelegramMessage(chatId, "❌ Registration Failed. Username not found.")
          } else {
            await sendTelegramMessage(chatId, `✅ Registration Successful! Hello ${subAdmin.full_name}, you can now claim orders in the group.`)
          }
        }
      }
      return new Response("ok")
    }

    // 2. Handle Callback Queries (Claim Button)
    if (body.callback_query) {
      const callbackQuery = body.callback_query
      const telegramId = callbackQuery.from.id.toString()
      const data = callbackQuery.data || "" 
      const message = callbackQuery.message

      if (data.startsWith("claim_")) {
        const txId = data.split("_")[1]

        // A. Find Sub-Admin
        const { data: subAdmin } = await supabase
          .from('sub_admins')
          .select('*')
          .eq('telegram_id', telegramId)
          .single()

        if (!subAdmin) {
          await answerCallbackQuery(callbackQuery.id, "❌ আপনি নিবন্ধিত সাব-এডমিন নন! আগে ইনবক্সে রেজিস্ট্রেশন করুন।", true)
          return new Response("ok")
        }

        // B. Check Transaction Status & Perform Atomic Update
        // We only allow claiming if assigned_sub_admin_id is null OR claim_time is more than 5 mins ago
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        
        const { data: updatedTx, error: updateError } = await supabase
          .from('transactions')
          .update({
            assigned_sub_admin_id: subAdmin.id,
            claim_time: new Date().toISOString(),
            sub_admin_action: 'claimed_via_telegram',
            updated_at: new Date().toISOString()
          })
          .eq('id', txId)
          .or(`assigned_sub_admin_id.is.null,claim_time.lt.${fiveMinsAgo}`)
          .select()
          .single()

        if (updateError || !updatedTx) {
          // If update failed, check if it's already claimed by the same person
          const { data: existingTx } = await supabase.from('transactions').select('*').eq('id', txId).single()
          
          if (existingTx?.assigned_sub_admin_id === subAdmin.id) {
             await answerCallbackQuery(callbackQuery.id, "✅ এই অর্ডারটি অলরেডি আপনি ক্লেইম করেছেন!")
          } else {
             await answerCallbackQuery(callbackQuery.id, "⏳ দুঃখিত, এটি অলরেডি অন্য একজন ক্লেইম করেছেন।", true)
          }
          return new Response("ok")
        }

        // E. Success Response
        await answerCallbackQuery(callbackQuery.id, `✅ অর্ডারটি সফলভাবে ক্লেইম হয়েছে! (${txId.slice(0,8)})`)

        // F. Edit Telegram Message
        const now = new Date()
        const originalText = message.text || ""
        const updatedText = originalText + `\n\n📌 <b>Claimed By:</b> ${subAdmin.full_name}\n⏳ <b>Time:</b> ${now.toLocaleTimeString()}`
        
        await editTelegramMessage(message.chat.id, message.message_id, updatedText)
      }
      return new Response("ok")
    }

    return new Response("ok")
  } catch (error) {
    console.error("Webhook Error:", error.message)
    return new Response(error.message, { status: 500 })
  }
})

async function sendTelegramMessage(chatId: string, text: string) {
  return fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

async function answerCallbackQuery(id: string, text: string, showAlert = false) {
  return fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: id, text, show_alert: showAlert }),
  })
}

async function editTelegramMessage(chatId: string, messageId: number, text: string) {
  return fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "✅ Claimed (In Process)", callback_data: "claimed_locked" }]]
      }
    }),
  })
}
