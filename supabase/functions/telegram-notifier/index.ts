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

    // 1. Data Mapping
    const userName = record.user_name || record.userName || record.full_name || record.customer_name || record.name || "Customer";
    const orderType = (record.type || record.order_type || "Transaction").replace('_', ' ').toUpperCase();
    const amount = record.amount || record.source_amount || record.total_amount || 0;
    const currency = record.currency || (record.type?.includes('withdraw') ? 'BDT' : 'VND');
    const country = record.country || record.target_country || "Bangladesh";
    const txId = record.id || record.uid || record.tx_id || "TX_" + Math.random().toString(36).slice(2, 7);
    
    let bankInfo: any = {};
    try {
      bankInfo = typeof record.bank_info === 'string' ? JSON.parse(record.bank_info) : (record.bank_info || record.bankInfo || record.receiver_info || record.receiverInfo || {});
    } catch (e) {
      bankInfo = record;
    }
    
    const bankName = (bankInfo as any).bankName || (bankInfo as any).bank_name || record.method || record.account_type || record.receiverName || record.receiver_name || "N/A";
    const holderName = (bankInfo as any).accountName || (bankInfo as any).account_name || (bankInfo as any).name || (bankInfo as any).receiverName || (bankInfo as any).receiver_name || record.receiverName || "N/A";
    const accNumber = (bankInfo as any).accountNumber || (bankInfo as any).account_number || record.receiver_number || record.receiverPhone || record.receiver_phone || (bankInfo as any).account_no || "N/A";

    const createdAt = record.created_at || record.createdAt ? new Date(record.created_at || record.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' }) : new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' });

    // 2. Format Message
    let message = `🚀 <b>New ${orderType} Received!</b>\n\n` +
                    `👤 <b>User:</b> ${userName}\n` +
                    `🌍 <b>Country:</b> ${country}\n` +
                    `💰 <b>Amount:</b> ${Number(amount).toLocaleString()} ${currency}\n`;
    
    if (record.target_currency && record.target_amount) {
      message += `🎯 <b>Target:</b> ${Number(record.target_amount).toLocaleString()} ${record.target_currency}\n`;
    }

    message += `💳 <b>Method:</b> ${bankName}\n` +
               `🔢 <b>Number:</b> <code>${accNumber}</code>\n` +
               `👤 <b>Holder:</b> ${holderName}\n` +
               `🆔 <b>ID:</b> <code>${txId}</code>\n` +
               `⏰ <b>Time:</b> ${createdAt}\n\n` +
               `📍 <i>Please claim this order to start processing.</i>`;

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
