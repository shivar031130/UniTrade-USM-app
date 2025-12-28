import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// We import the famous 'nodemailer' library directly from NPM
import nodemailer from "npm:nodemailer@6.9.7"

const SMTP_EMAIL = Deno.env.get('SMTP_EMAIL')
const SMTP_PASSWORD = Deno.env.get('SMTP_PASSWORD')

serve(async (req) => {
  try {
    const payload = await req.json()
    const { record, old_record } = payload

    // LOGIC: Only send if 'is_approved' changes from false to true
    if (record.is_approved === true && old_record.is_approved !== true) {
      
      console.log(`Starting email send to ${record.email}...`)

      // 1. Setup the Transporter (Connect to Gmail)
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // use SSL
        auth: {
          user: SMTP_EMAIL,
          pass: SMTP_PASSWORD,
        },
      });

      // 2. Send the Email
      const info = await transporter.sendMail({
        from: `"UniTrade Admin" <${SMTP_EMAIL}>`, // Proper format: "Name" <email>
        to: record.email,
        subject: "You are Approved! Welcome to UniTrade 🎉",
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h1 style="color: #3b82f6;">Welcome, ${record.full_name}!</h1>
            <p>Your account has been reviewed and <strong>approved</strong> by our admin team.</p>
            <p>You can now log in and start trading immediately.</p>
            <br>
            <a href="https://uni-trade-lyart.vercel.app/" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a>
          </div>
        `,
      });

      console.log("Email sent successfully! ID:", info.messageId)
      return new Response(JSON.stringify({ message: "Email sent", id: info.messageId }), { headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ message: "No email needed - Status did not change to approved" }), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error("CRITICAL ERROR:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})