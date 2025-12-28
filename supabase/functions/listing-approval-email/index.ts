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
    const { record, old_record } = payload

    // DEBUG LOGS
    console.log(`EVENT RECEIVED: Listing ${record.id}`)
    console.log(`New Status: ${record.status}, Old Status: ${old_record?.status}`)

    // 1. LOGIC CHECK
    if (record.status === 'active' && old_record.status !== 'active') {
      
      console.log(`Status match! Fetching seller ${record.seller_id}...`)

      const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

      // 2. Fetch Seller Email
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', record.seller_id)
        .single()

      if (error || !profile) {
        console.error("ERROR: Could not find seller profile.", error)
        // We return 200 to stop the database from retrying endlessly, but log the error
        return new Response("Seller not found", { status: 200 }) 
      }

      console.log(`Found seller: ${profile.email}. Sending email...`)

      // 3. Send Email
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 465, secure: true,
        auth: { user: SMTP_EMAIL, pass: SMTP_PASSWORD }
      })

      await transporter.sendMail({
        from: `"UniTrade Admin" <${SMTP_EMAIL}>`,
        to: profile.email,
        subject: "Your Item is Live! 🚀",
        html: `
           <div style="font-family: Arial, sans-serif; color: #333;">
            <h1 style="color: #10b981;">Listing Approved!</h1>
            <p>Hi ${profile.full_name},</p>
            <p>Great news! Your listing <strong>${record.title}</strong> is now live.</p>
            <a href="https://uni-trade-lyart.vercel.app/products.html?id=${record.id}">View Listing</a>
          </div>
        `
      })

      console.log("Email sent successfully!")
      return new Response(JSON.stringify({ message: "Email sent" }), { headers: { 'Content-Type': 'application/json' } })
    }

    console.log("No email needed (Status criteria not met)")
    return new Response(JSON.stringify({ message: "No action" }), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error("CRITICAL ERROR:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})