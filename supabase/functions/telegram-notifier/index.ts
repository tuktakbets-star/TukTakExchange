import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

/**
 * Supabase Edge Function to send Telegram notifications
 * 
 * Target Table: orders
 * Trigger: INSERT
 */

const TELEGRAM_BOT_TOKEN = "8057725957:AAHTq11nuL7JPjz_t-7OsuvZvfZIVDeEYGU"
const TELEGRAM_CHAT_ID = "-1003961332934"

serve(async (req) => {
  // Handle CORS for direct frontend calls if needed
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    // 1. Parse payload
    // If triggered by Webhook, Supabase sends a JSON with 'type', 'table', 'record', etc.
    const body = await req.json()
    
    // Support both Webhook trigger and direct call
    const record = body.record || body

    // Mapping fields from the 'transactions' table (real app data)
    const userName = record.user_name || record.userName || record.name || record.customer_name || "Customer";
    const orderType = (record.type || "Transaction").toUpperCase();
    const amount = record.amount || record.total_amount || record.totalAmount || "0";
    const currency = record.currency || "BDT";
    const country = record.country || "Unknown";
    const bankInfo = record.bank_info || record.bankInfo || {};
    const accName = bankInfo.accountName || bankInfo.account_name || "N/A";
    const accType = bankInfo.accountType || bankInfo.account_type || record.method || "N/A";
    const createdAt = record.created_at || record.createdAt ? new Date(record.created_at || record.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }) : "Just now";

    // 2. Format Message
    const message = `🚨 <b>নতুন অর্ডার এসেছে! (V2 Updated)</b>\n\n` +
                    `👤 <b>User:</b> ${userName}\n` +
                    `🌍 <b>Country:</b> ${country}\n` +
                    `💱 <b>Type:</b> ${orderType}\n` +
                    `💰 <b>Amount:</b> ${amount} ${currency}\n` +
                    `💳 <b>Account:</b> ${accName} (${accType})\n` +
                    `⏰ <b>Time:</b> ${createdAt}`;

    // 3. Send to Telegram
    const telegramApi = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(telegramApi, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📥 ক্লেইম করুন (Claim)", callback_data: `claim_${record.id}` }
            ]
          ]
        }
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Telegram API Error: ${data.description}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      { 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*" 
        }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error("Function Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*" 
        }, 
        status: 400 
      }
    );
  }
})
