# Booking form → WhatsApp (design)

## Context

The booking form (`index.html:317`, logic in `js/main.js:446-503`) is front-end
only. `submitBooking()` is a stub (`js/main.js:467-471`) that just logs the
payload — the README and an inline comment already anticipated wiring it to
"a backend... or a wa.me link." The live site is static (nginx, no PHP), and
there's no WhatsApp Business API account set up, so a server-side send isn't
on the table right now. A `wa.me` click-to-chat link needs no backend and
works today.

## Goal

Submitting the booking form opens WhatsApp (app or web) with a pre-filled
message addressed to a fixed number, carrying the booking details the visitor
just entered. The visitor still taps "send" themselves inside WhatsApp — a
`wa.me` link cannot send automatically.

## Design

**Number:** `254713234606` (WhatsApp expects digits only, no `+`), added to
`CONFIG` in `js/main.js`:

```js
var CONFIG = {
  ...
  whatsappNumber: '254713234606'
};
```

**Message format** (plain text, URL-encoded into the `wa.me` link):

```
New booking request — Villa CDE

Name: {name}
Dates: {check_in} → {check_out} ({nights} nights)
Guests: {guests}
Estimate: {estimate formatted as money}
Phone: {phone}
Occasion/requests: {message}
```

Omit the `Phone:` and `Occasion/requests:` lines when those fields are empty
(both are optional in the form).

**Flow change in `submitBooking(data)`** (`js/main.js:467`):

1. Build the message string from `data` (already has `nights` and `estimate`
   computed by the existing submit handler).
2. Open `https://wa.me/254713234606?text=<encodeURIComponent(message)>` in a
   new tab (`window.open(url, '_blank')`).
3. Resolve immediately (no network round-trip — this isn't a real async
   operation, just keeping the existing `.then()` shape in the submit
   handler intact).

**Thank-you copy:** `#booking-thanks` currently reads "We will be in touch
shortly to confirm your dates at Villa CDE." Update it to make clear the
WhatsApp message still needs to be sent by the visitor, e.g.: "We've opened
WhatsApp with your request — send that message to confirm your dates at
Villa CDE."

## Out of scope

- Any server-side send (WhatsApp Business Cloud API, Twilio, etc.) — no
  account/token exists for this, and the live vhost has no PHP.
- Changing the "Phone / WhatsApp" field from optional to required.
- Popup-blocker handling — `window.open` from a user-initiated submit event
  is not blocked by browsers' default popup blockers.

## Testing

Manual: fill the form, submit, confirm a new tab opens to `wa.me` with the
expected message text, and the thank-you screen shows in the original tab.
No automated tests exist for this form today; none are being added here.
