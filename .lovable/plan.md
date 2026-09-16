# Connect the WhatsApp Phone Number ID

## What will be done

1. Open a secure entry form for the WhatsApp Phone Number ID and replace the existing incorrect value without exposing it in chat or source code.
2. Confirm the website can read both the existing WhatsApp access token and the corrected Phone Number ID.
3. Send a controlled test message through the existing WhatsApp integration and capture Meta’s exact response.
4. Verify that successful sends are recorded and that payment confirmations and webinar notices use the corrected sender configuration.
5. If Meta rejects the test, report the precise account, permission, template, or recipient restriction without changing unrelated features.

## Technical details

- Update the existing `WHATSAPP_PHONE_NUMBER_ID` runtime secret; do not create a duplicate.
- Keep the access token server-side and never expose either credential in browser code or logs.
- Validate the existing payment and webinar notification paths after the credential update.
- No unrelated database, page, course, webinar, or security changes will be made.

## Needed from you after approval

Enter the Phone Number ID in the secure form I open. Please do not paste it into chat.
