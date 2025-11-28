// Email notification utilities

export async function sendAdminNotification(data: {
  adminEmail: string;
  shopName: string;
  email: string;
  shopSlug: string;
  userId: string;
}) {
  const emailBody = `
New Shop Registration on WorkBench Inventory System
====================================================

A new shop has registered and requires admin approval.

Shop Details:
-------------
Shop Name: ${data.shopName}
Email: ${data.email}
Shop Slug: ${data.shopSlug}
User ID: ${data.userId}
Registration Time: ${new Date().toISOString()}

Action Required:
----------------
Please review and approve this shop registration.

View Shop: https://workbench-inventory.randunun.workers.dev/api/shop/${data.shopSlug}

---
This is an automated notification from WorkBench Inventory System.
`;

  // Using a simple email service - you can replace this with your preferred service
  // Options: Mailgun, SendGrid, Resend, etc.

  // For now, we'll log it and prepare for integration
  console.log('Admin Notification:', {
    to: data.adminEmail,
    subject: `New Shop Registration: ${data.shopName}`,
    body: emailBody
  });

  // Example: Using Mailgun API (you'll need to add MAILGUN_API_KEY to wrangler.toml)
  /*
  const mailgunDomain = 'YOUR_DOMAIN';
  const mailgunApiKey = env.MAILGUN_API_KEY;

  const formData = new FormData();
  formData.append('from', 'WorkBench System <noreply@workbench.com>');
  formData.append('to', data.adminEmail);
  formData.append('subject', `New Shop Registration: ${data.shopName}`);
  formData.append('text', emailBody);

  const response = await fetch(
    `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${mailgunApiKey}`)}`
      },
      body: formData
    }
  );

  return response.ok;
  */

  // Example: Using a webhook/serverless function
  try {
    const response = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.adminEmail,
        subject: `New Shop Registration: ${data.shopName}`,
        message: emailBody,
        shopName: data.shopName,
        shopEmail: data.email,
        shopSlug: data.shopSlug
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send admin notification:', error);
    return false;
  }
}

// Alternative: Send via email using Resend API (recommended for Cloudflare Workers)
export async function sendAdminNotificationResend(
  resendApiKey: string,
  data: {
    adminEmail: string;
    shopName: string;
    email: string;
    shopSlug: string;
    userId: string;
  }
) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'WorkBench System <onboarding@resend.dev>',
        to: [data.adminEmail],
        subject: `🏪 New Shop Registration: ${data.shopName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0f172a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
    .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .detail-row { margin: 10px 0; }
    .label { font-weight: bold; color: #64748b; }
    .value { color: #0f172a; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
    .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🏪 New Shop Registration</h1>
      <p style="margin: 5px 0 0 0;">WorkBench Inventory System</p>
    </div>

    <div class="content">
      <p>A new shop has registered on the WorkBench platform and requires your review.</p>

      <div class="details">
        <h3 style="margin-top: 0;">Shop Details</h3>
        <div class="detail-row">
          <span class="label">Shop Name:</span>
          <span class="value">${data.shopName}</span>
        </div>
        <div class="detail-row">
          <span class="label">Email:</span>
          <span class="value">${data.email}</span>
        </div>
        <div class="detail-row">
          <span class="label">Shop Slug:</span>
          <span class="value">${data.shopSlug}</span>
        </div>
        <div class="detail-row">
          <span class="label">User ID:</span>
          <span class="value">${data.userId}</span>
        </div>
        <div class="detail-row">
          <span class="label">Registration Time:</span>
          <span class="value">${new Date().toLocaleString()}</span>
        </div>
      </div>

      <p><strong>Action Required:</strong> Please review and approve this shop registration.</p>

      <a href="https://workbench-inventory.randunun.workers.dev/api/shop/${data.shopSlug}" class="button">
        View Shop Details
      </a>
    </div>

    <div class="footer">
      <p>This is an automated notification from WorkBench Inventory System</p>
      <p>© 2025 WorkBench - Global Inventory Network</p>
    </div>
  </div>
</body>
</html>
        `,
        text: `
New Shop Registration on WorkBench Inventory System

Shop Details:
- Shop Name: ${data.shopName}
- Email: ${data.email}
- Shop Slug: ${data.shopSlug}
- User ID: ${data.userId}
- Registration Time: ${new Date().toLocaleString()}

Action Required: Please review and approve this shop registration.

View Shop: https://workbench-inventory.randunun.workers.dev/api/shop/${data.shopSlug}
        `
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Email sent successfully:', result);
      return true;
    } else {
      const error = await response.text();
      console.error('Failed to send email:', error);
      return false;
    }
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}
