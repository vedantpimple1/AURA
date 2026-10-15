export function renderEmailLayout(title: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; color: #111827; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; }
    .header { margin-bottom: 24px; text-align: center; }
    .header h1 { font-size: 24px; font-weight: 700; color: #111827; margin: 0; }
    .brand { color: #6366f1; font-weight: 800; font-size: 28px; margin-bottom: 16px; display: block; text-decoration: none; letter-spacing: 0.05em; }
    .content { font-size: 16px; line-height: 1.6; color: #374151; }
    .footer { margin-top: 32px; font-size: 14px; color: #6b7280; text-align: center; }
    .btn { display: inline-block; background-color: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 16px; margin-bottom: 16px; }
    .metadata { background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 14px; border-left: 4px solid #6366f1; }
    .text-sm { font-size: 14px; }
    .strong { font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <a href="#" class="brand">KAI AURA</a>
        <h1>${title}</h1>
      </div>
      <div class="content">
        ${contentHtml}
      </div>
    </div>
    <div class="footer">
      This is an automated notification from KAI Aura.<br>
      You can manage your notification preferences in your account settings.
    </div>
  </div>
</body>
</html>`;
}
