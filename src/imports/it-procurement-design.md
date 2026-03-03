Design a professional enterprise-grade IT Procurement and Finance Management system for a retail company with multiple locations.

The system must include both:
1) Responsive Web App (desktop-first)
2) Mobile App (iOS/Android style)

STYLE:
- Clean, minimal, high-end corporate design (similar to Stripe / Notion / Apple)
- Use a lot of white space, soft gray backgrounds, subtle borders
- Typography: modern sans-serif (Inter / SF Pro style)
- Color system:
  - Primary: deep blue (#1E3A8A)
  - Success: green (#16A34A)
  - Warning: amber (#F59E0B)
  - Danger: red (#DC2626)
- Use thin icons (outline style)
- No heavy shadows, keep it elegant and fast

CORE MODULES TO DESIGN:

1) DASHBOARD
- KPIs: Total monthly spend, pending approvals, active subscriptions, unpaid invoices
- Charts: monthly spend trend, cost by category, cost by store
- Quick actions: "New Request", "Upload Invoice"

2) REQUEST MANAGEMENT (Procurement)
- Table view:
  - Request ID
  - Title
  - Store/location
  - Requester
  - Vendor
  - Amount (with/without VAT)
  - Status (Draft, Pending, Approved, Rejected, Ordered, Delivered, Closed)
- Filters + search
- Detail page:
  - Full request info
  - Attachments (PDF, images, files)
  - Approval timeline (who approved/rejected + comments)

3) APPROVAL FLOW UI
- Visual step flow:
  IT → Manager → Finance → CEO
- Approve / Reject buttons with comment input
- Show decision history

4) FINANCE MODULE (Invoices & Pre-invoices)
- Inbox view for finance team:
  - Uploaded documents (image, PDF)
  - Auto-extracted fields (vendor, amount, date, VAT)
- Status:
  Received → Matched → Checked → Approved for Payment → Paid
- Payment details (method, date)

5) DOCUMENT UPLOAD UX
- Mobile-first camera capture screen
- Drag & drop upload for web
- File preview (image/PDF viewer)

6) ASSET MANAGEMENT
- Table of purchased equipment:
  - Device name
  - Serial number
  - Purchase date
  - Warranty
  - Assigned to
  - Location

7) SUBSCRIPTION MANAGEMENT
- List of monthly services:
  - Service name
  - Vendor
  - Monthly cost
  - Renewal date
- Alerts for upcoming renewals

8) REPORTS
- Clean export-ready tables
- Filters by date, store, vendor
- Summary cards

MOBILE APP REQUIREMENTS:
- Focus on:
  - Create request
  - Approve/reject requests
  - Scan/upload invoice
  - View notifications
- Bottom navigation (Dashboard, Requests, Finance, Profile)
- Fast, thumb-friendly UI

UX REQUIREMENTS:
- Everything must be simple and fast
- Reduce friction for approvals (1–2 taps max)
- Clear status colors and labels
- Show financial data clearly and transparently

OUTPUT:
- Create full design system (colors, typography, components)
- Create reusable components (buttons, tables, cards, forms)
- Design 8–10 key screens for web
- Design 5–7 key screens for mobile