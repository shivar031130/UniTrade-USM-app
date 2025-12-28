import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import nodemailer from "npm:nodemailer@6.9.7"

const SMTP_EMAIL = Deno.env.get('SMTP_EMAIL')
const SMTP_PASSWORD = Deno.env.get('SMTP_PASSWORD')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    const payload = await req.json()
    const { record } = payload

    console.log(`New Order ${record.id}! Processing receipt...`)

    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 1. Fetch Buyer Info
    const { data: buyer, error: buyerErr } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', record.buyer_id)
      .single()

    if (buyerErr || !buyer) {
      console.error("Buyer not found:", buyerErr)
      return new Response("Buyer not found", { status: 404 })
    }

    // 2. Fetch Seller Info (NEW)
    const { data: seller, error: sellerErr } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', record.seller_id)
      .single()

    // 3. Fetch Product Details (Added description & pickup_location)
    const { data: product, error: prodErr } = await supabaseAdmin
      .from('listings')
      .select('title, image_url, price, description, pickup_location')
      .eq('id', record.listing_id)
      .single()

    if (prodErr || !product) {
      console.error("Product not found:", prodErr)
    }

    // 4. Send Email
    console.log(`Sending receipt to ${buyer.email}...`)
    
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: SMTP_EMAIL, pass: SMTP_PASSWORD }
    })

    const orderDate = new Date(record.created_at).toLocaleDateString()
    const total = record.amount_paid.toFixed(2)
    const deliveryMethod = record.shipping_method || 'Standard Delivery' // Fallback if empty

    // Logic: Only show location if the method implies meeting up
    const showLocation = deliveryMethod.toLowerCase().includes('pickup') || deliveryMethod.toLowerCase().includes('meetup');
    const locationText = showLocation ? product?.pickup_location : 'N/A (Courier)';

    await transporter.sendMail({
      from: `"UniTrade Orders" <${SMTP_EMAIL}>`,
      to: buyer.email,
      subject: `Receipt for Order #${record.id.slice(0,8).toUpperCase()} 🧾`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; border: 1px solid #ddd; padding: 0; border-radius: 10px; overflow: hidden;">
          
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-bottom: 1px solid #ddd;">
            <h2 style="color: #3b82f6; margin: 0;">Order Confirmed!</h2>
            <p style="margin: 5px 0 0; color: #64748b;">Hi ${buyer.full_name}, thank you for your purchase.</p>
          </div>

          <div style="padding: 20px;">
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr style="border-bottom: 2px solid #eee;">
                <th style="padding: 10px; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase;">Item Description</th>
                <th style="padding: 10px; text-align: right; color: #64748b; font-size: 12px; text-transform: uppercase;">Price</th>
              </tr>
              <tr>
                <td style="padding: 15px 10px; border-bottom: 1px solid #eee;">
                  <div style="font-size: 16px; font-weight: bold; color: #333;">${product?.title || 'Unknown Item'}</div>
                  <div style="font-size: 13px; color: #666; margin-top: 4px;">${product?.description ? product.description.substring(0, 100) + '...' : ''}</div>
                  <div style="font-size: 12px; color: #999; margin-top: 4px;">Qty: ${record.quantity}</div>
                </td>
                <td style="padding: 15px 10px; border-bottom: 1px solid #eee; text-align: right; vertical-align: top; font-weight: bold;">
                  RM ${total}
                </td>
              </tr>
              <tr>
                <td style="padding: 15px 10px; text-align: right; font-weight: bold;">Total Paid:</td>
                <td style="padding: 15px 10px; text-align: right; font-weight: bold; color: #10b981; font-size: 18px;">RM ${total}</td>
              </tr>
            </table>

            <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 14px; margin-bottom: 25px;">
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 5px 0; color: #64748b; width: 40%;">Seller:</td>
                  <td style="padding: 5px 0; font-weight: 600;">${seller?.full_name || 'Unknown'}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #64748b;">Delivery Method:</td>
                  <td style="padding: 5px 0; font-weight: 600;">${deliveryMethod}</td>
                </tr>
                 <tr>
                  <td style="padding: 5px 0; color: #64748b;">Pickup/Meetup Location:</td>
                  <td style="padding: 5px 0; font-weight: 600;">${locationText}</td>
                </tr>
              </table>
            </div>

            <p style="text-align: center; margin-bottom: 0;">
              <a href="https://uni-trade-lyart.vercel.app/tracking.html?tx=${record.id}" 
                 style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                 Track Order Status
              </a>
            </p>
          </div>

          <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #ddd; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0;">Order ID: ${record.id} &bull; Date: ${orderDate}</p>
            <p style="margin: 5px 0 0;">Need help? Reply to this email.</p>
          </div>

        </div>
      `
    })

    return new Response(JSON.stringify({ message: "Receipt sent" }), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error("Error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})