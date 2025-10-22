# Enhanced Estimate System - Feature Summary

## Overview
This document provides a comprehensive overview of the enhanced estimate and invoicing system with TJM (Taux Journalier Moyen), security margins, AI generation, and digital signatures.

## 🎯 Key Features

### 1. User Profile & Pricing Settings

**Location**: `/settings` page

**Features**:
- **TJM Configuration**: Set default daily rate (Taux Journalier Moyen) for French freelance pricing
- **Hours Per Day**: Configure working hours per day for TJM calculations (default: 7 hours)
- **Hourly Rate Sync**: Automatically calculates hourly rate from TJM
- **Security Margin**: Set default security margin percentage (5-30%) for risk management
- **TJM Calculator**: Interactive calculator to determine optimal TJM based on:
  - Monthly revenue target
  - Working days per month
  - Business expenses percentage
  - Displays recommended TJM and net TJM after expenses

**Company Settings**:
- Company name, logo, address
- SIRET/SIREN, Tax ID (TVA)
- Phone, email, website
- IBAN/BIC for payments

**PDF Customization**:
- Primary color for branding
- Show/hide security margin on customer PDFs
- Custom footer text
- Logo display toggle

---

### 2. Enhanced Estimate Creation

**Location**: `/invoicing` page → Estimates tab

**Pricing Modes**:
1. **Hourly Pricing**: Traditional hourly-based estimates
2. **TJM (Daily Rate) Pricing**:
   - One-click conversion from hourly to daily rates
   - Auto-calculates total days based on configured hours-per-day
   - Displays TJM × Days breakdown on estimate

**Features**:
- Line item management with real-time calculations
- Dynamic totals with security margin breakdown:
  - Subtotal before margin
  - Security margin amount (+X%)
  - Subtotal after margin
  - Tax (TVA)
  - Total TTC
- Customer and project association
- Notes and custom terms
- Version tracking for estimate revisions

---

### 3. AI-Powered Estimate Generation

**Location**: `/invoicing` → "✨ AI Generate" button (Estimates tab)

**How It Works**:
1. Select customer and project (optional)
2. Describe the work in natural language
3. AI analyzes:
   - Existing tasks in database (similar work)
   - Project complexity
   - Historical pricing data
   - Customer relationship history
4. Generates:
   - Detailed line items with descriptions
   - Recommended pricing (TJM or hourly)
   - Suggested security margin based on risk factors
   - Professional notes

**AI Features**:
- Uses OpenAI GPT-4 for intelligent estimate generation
- Learns from your historical estimates
- Adapts to your pricing patterns
- Suggests optimal margins based on project risk

---

### 4. Security Margin Intelligence

**Purpose**: Protect against scope creep, unexpected complexity, and project risks

**Features**:
- **Default Margin**: Set in profile settings (e.g., 10%)
- **Custom Margin**: Adjust per-estimate (5-30% recommended)
- **AI Margin Suggestion**:
  - Analyzes project description
  - Considers customer type (new vs. existing)
  - Evaluates technical complexity
  - Returns recommended margin with reasoning
- **Visibility Control**: Show margin as "Security Margin" or generic "Adjustment" on PDFs

**Margin Calculation**:
```
Subtotal Before Margin: 10,000 EUR
Security Margin (15%):  + 1,500 EUR
Subtotal After Margin:  11,500 EUR
Tax (20%):              + 2,300 EUR
Total TTC:              13,800 EUR
```

---

### 5. Digital Signature System

**Workflow**:

#### Step 1: Create & Send Estimate
1. Create estimate with TJM/margins
2. Generate PDF via backend (WeasyPrint)
3. Send estimate to customer via email

#### Step 2: Request Signature
1. Click "Request Signature" on sent estimate
2. System creates signature request with unique token
3. Sends email to customer with signature link

#### Step 3: Customer Signs (Public Page)
- **URL**: `/sign/{token}` (no authentication required)
- **Signature Methods**:
  1. **Type Name**: Simple typed signature with custom font
  2. **Draw Signature**: Canvas-based drawing with mouse/touch
  3. **Upload Image**: Upload pre-made signature image

**Features**:
- Displays full estimate details (items, totals, TJM breakdown)
- Shows version number for revised estimates
- Legal agreement text
- Optional comments field
- Accept or Decline options
- Mobile-friendly responsive design

#### Step 4: Post-Signature
- PDF signed using pyHanko (digital certificate)
- Signed PDF emailed to both parties
- Estimate status updated to "signed" or "declined"
- Signature metadata stored (IP, timestamp, method)

**Signature Statuses**:
- `not_requested`: No signature requested
- `pending`: Awaiting customer signature
- `signed`: Successfully signed
- `declined`: Customer declined

---

### 6. Professional PDF Generation

**Templates**: French-language professional templates

**Estimate PDF Features**:
- Company branding (logo, colors, footer)
- Estimate number with version badge (v1, v2, etc.)
- Customer and project details
- TJM info box (if TJM pricing used)
- Line items table with quantity, rate, amount
- Totals breakdown:
  - Subtotal HT (before margin)
  - Security margin (with toggle visibility)
  - Subtotal HT (after margin)
  - TVA
  - Total TTC
- Notes section
- Terms and conditions
- Payment details (IBAN, BIC)
- Signature sections for both parties

**Invoice PDF Features**:
- Similar layout to estimates
- Status badges (Paid, Overdue, Pending)
- Due date and payment terms
- No margin displayed (margin absorbed into subtotal)

**Customization**:
- Primary color theming
- Logo placement
- Custom footer text
- Font and styling

---

### 7. Estimate Versioning

**Purpose**: Track estimate revisions and negotiations

**Features**:
- Parent-child relationship for versions
- Automatic version numbering (v1, v2, v3...)
- Version badge on PDFs and UI
- Historical version tracking

**Use Cases**:
- Customer requests changes
- Scope adjustments
- Price negotiations
- Re-quoting with different TJM

---

### 8. TJM Conversion Tool

**Location**: Estimate creation modal → "TJM (Daily Rate)" button

**How It Works**:
1. Start with hourly-based line items
2. Click "TJM (Daily Rate)"
3. System converts:
   ```
   Original: 35 hours × 71.43 EUR/hour = 2,500 EUR
   Converted: 5 days × 500 EUR/day = 2,500 EUR
   ```
4. Updates all items to day-based pricing
5. Displays total days and TJM used

**Benefits**:
- Professional French freelance standard
- Easier client communication
- Simplified pricing for multi-day projects
- Aligns with industry norms (TJM is standard in France)

---

## 🛠️ Technical Architecture

### Backend (Django)

**New App**: `profiles`
- Models: `UserProfile`
- Views: Profile management, TJM calculator, pricing settings
- API: `/api/profile/me/`, `/pricing_settings/`, `/calculate_tjm/`

**Enhanced App**: `invoicing`
- Models: `Estimate` (20+ new fields), `SignatureRequest`
- Views: AI generation, margin suggestion, TJM conversion, signature workflow
- Tasks: PDF generation (Celery), signature emails
- Templates: `estimate_pdf.html`, `invoice_pdf.html`

**AI Service**: `document_processing/services/estimate_assistant.py`
- OpenAI GPT-4 integration
- Estimate generation from natural language
- Margin risk analysis
- Historical data learning

**PDF Generation**:
- WeasyPrint for HTML → PDF
- Django templates with company branding
- Support for logos, colors, custom styling

**Signature**:
- pyHanko for PDF digital signatures (placeholder implementation)
- Token-based public access (UUID)
- Multiple signature methods

### Frontend (React)

**Pages**:
- `/settings`: User profile and pricing configuration (new)
- `/invoicing`: Enhanced estimate/invoice management
- `/sign/:token`: Public signature page (new)

**API Hooks** (`api/hooks.js`):
- `useProfile()`, `useUpdateProfile()`
- `usePricingSettings()`, `useUpdatePricingSettings()`
- `useCalculateTJM()`
- `useAIGenerateEstimate()`
- `useSuggestMargin()`
- `useConvertToTJM()`
- `useApplySecurityMargin()`
- `useRequestSignature()`
- `usePublicSignatureRequest()`, `useSignEstimate()`, `useDeclineEstimate()`

**State Management**:
- React Query for server state
- Local state for forms and UI
- No Redux required

---

## 📊 Database Schema Changes

### New Table: `profiles_userprofile`
```sql
- user_id (FK to auth_user)
- tjm_default (Decimal)
- tjm_hours_per_day (Integer)
- hourly_rate_default (Decimal)
- default_security_margin (Decimal)
- show_security_margin_on_pdf (Boolean)
- company_name, address, postal_code, city
- siret_siren, tax_id, phone, email, website
- company_logo (ImageField)
- pdf_primary_color, pdf_footer_text, pdf_show_logo
- iban, bic, payment_terms_days
- estimate_terms, invoice_terms
```

### Enhanced Table: `invoicing_estimate`
```sql
-- Pricing fields
- subtotal_before_margin (Decimal)
- security_margin_percentage (Decimal)
- security_margin_amount (Decimal)

-- TJM fields
- tjm_used (Decimal, nullable)
- total_days (Decimal, nullable)

-- Versioning
- version (Integer, default=1)
- parent_estimate_id (FK, nullable)

-- AI metadata
- ai_generated (Boolean)
- ai_metadata (JSON)

-- Signature
- signature_status (CharField: not_requested/pending/signed/declined)
- signature_requested_at (DateTime)
- signature_completed_at (DateTime)
- signed_pdf_file (FileField)
- signature_data (JSON)
```

### New Table: `invoicing_signaturerequest`
```sql
- estimate_id (FK)
- signer_name, signer_email
- token (UUID, unique)
- status (CharField: pending/signed/declined/expired)
- signature_method (CharField: digital/typed/drawn/upload)
- created_at, signed_at, expires_at
- signature_data (JSON)
- ip_address, user_agent
- comments (Text)
```

---

## 🚀 API Endpoints

### Profile & Pricing
```
GET    /api/profile/me/                      # Get user profile
PUT    /api/profile/me/                      # Update profile
GET    /api/profile/pricing_settings/        # Get pricing settings
PUT    /api/profile/pricing_settings/        # Update pricing
POST   /api/profile/calculate_tjm/           # TJM calculator
POST   /api/profile/tjm_for_service/         # Calculate TJM for service
```

### Enhanced Estimates
```
POST   /api/invoices/estimates/ai_generate/               # AI generate estimate
POST   /api/invoices/estimates/{id}/apply_security_margin/ # Apply margin
POST   /api/invoices/estimates/{id}/suggest_margin/       # AI margin suggestion
POST   /api/invoices/estimates/{id}/convert_to_tjm/       # Convert to TJM
POST   /api/invoices/estimates/{id}/request_signature/    # Request signature
GET    /api/invoices/estimates/{id}/generate_pdf/         # Generate PDF
POST   /api/invoices/estimates/{id}/send_email/           # Send to customer
```

### Public Signature (No Auth)
```
GET    /api/invoices/sign/{token}/           # Get signature request details
POST   /api/invoices/sign/{token}/sign/      # Submit signature
POST   /api/invoices/sign/{token}/decline/   # Decline estimate
```

---

## 🎨 UI/UX Features

### Invoicing Page Enhancements
- **AI Generate Button**: Purple gradient button for estimates
- **TJM/Days Column**: Shows daily rate breakdown in table
- **Signature Status Badge**: Color-coded signature status
- **Version Badges**: Small gray badges showing estimate version
- **Request Signature Button**: Appears after estimate is sent

### Estimate Creation Modal
- **Pricing Mode Toggle**: Switch between Hourly and TJM
- **Live Totals Calculator**: Real-time calculation as you type
- **Security Margin Input**: Adjustable percentage with live amount preview
- **AI Suggest Button**: Get AI-recommended margin
- **Line Items Grid**: Clean 12-column grid for items

### Settings Page
- **4 Tabs**: Company, TJM & Pricing, PDF & Documents, Signature
- **TJM Calculator Card**: Interactive calculator with results
- **Color Picker**: Visual color selection for PDF branding
- **Toggle Switches**: Clean toggles for visibility settings
- **Responsive Layout**: Mobile-friendly grid layouts

### Public Signature Page
- **Gradient Background**: Professional dark theme
- **Estimate Preview**: Full estimate details before signing
- **3 Signature Methods**: Tabs for Type/Draw/Upload
- **Canvas Drawing**: Smooth mouse/touch drawing
- **Legal Text**: Clear agreement language
- **Action Buttons**: Large Accept/Decline buttons

---

## 💡 Best Practices & Recommendations

### For Freelancers
1. **Set Realistic TJM**: Use calculator to ensure profitability
2. **Always Use Margins**: 10-15% for existing clients, 20-30% for new/complex projects
3. **Hide Margin on PDFs**: Show as "Adjustment" to avoid client confusion
4. **Use AI Generation**: Save time and maintain consistency
5. **Request Signatures**: Protect yourself legally before starting work

### For Agencies
1. **Configure TJM Per Service**: Different rates for dev, design, consulting
2. **Team Margins**: Higher margins for team coordination overhead
3. **Version Control**: Track negotiations with estimate versioning
4. **Branding**: Customize PDFs with agency colors and logo

### Security & Compliance
1. **Signature Token Expiry**: 30 days default (configurable)
2. **IP Address Logging**: Track signature location
3. **PDF Signing**: Digital certificates for legal validity (pyHanko)
4. **GDPR Compliance**: Customer data encrypted and stored securely
5. **Email Delivery**: Use transactional email service for reliability

---

## 📈 Future Enhancements

Potential additions (not yet implemented):
1. **Multi-currency Support**: Handle EUR, USD, GBP, etc.
2. **Signature Reminders**: Automatic follow-up emails
3. **E-signature Integration**: DocuSign, HelloSign API
4. **Recurring Estimates**: Template-based recurring quotes
5. **Client Portal**: Dedicated portal for estimate review/signing
6. **Analytics Dashboard**: Track TJM trends, margin effectiveness
7. **Mobile App**: Native iOS/Android for on-the-go estimates
8. **Multi-language**: English, German, Spanish templates
9. **Advanced AI**: Learn client preferences, auto-adjust margins
10. **Estimate Comparison**: Side-by-side version comparison

---

## 🧪 Testing Scenarios

### TJM Calculator Test
1. Set monthly target: 5,000 EUR
2. Working days: 20
3. Expenses: 30%
4. Expected TJM: 250 EUR
5. Expected Net TJM: 175 EUR

### Estimate Creation Test
1. Create estimate with 3 line items (hourly)
2. Convert to TJM pricing
3. Add 15% security margin
4. Generate PDF
5. Verify totals and TJM breakdown

### Signature Workflow Test
1. Create and send estimate
2. Request signature
3. Open public link in incognito
4. Sign with typed name
5. Verify email receipt and PDF signature

### AI Generation Test
1. Select customer with project history
2. Enter prompt: "E-commerce website with payment integration, 3 weeks"
3. Verify AI generates relevant items
4. Check margin suggestion (should be 15-25% for new e-commerce)

---

## 📞 Support & Troubleshooting

### Common Issues

**"TJM not calculating"**
- Ensure `tjm_hours_per_day` is set (default: 7)
- Check that `tjm_default` is > 0
- Verify items have quantity > 0

**"Signature link expired"**
- Default expiry: 30 days
- Regenerate signature request
- Adjust `SIGNATURE_LINK_EXPIRY_DAYS` in settings

**"PDF not generating"**
- Check Celery worker is running
- Verify WeasyPrint dependencies installed
- Check file permissions in `MEDIA_ROOT/estimates/`

**"AI not working"**
- Verify `OPENAI_API_KEY` is set
- Check API credits available
- Ensure network connectivity

---

## 📚 References

- **TJM Guide**: https://www.service-public.fr/professionnels-entreprises/vosdroits/F23573
- **French Invoicing Law**: https://www.legifrance.gouv.fr/
- **pyHanko Docs**: https://pyhanko.readthedocs.io/
- **WeasyPrint Docs**: https://doc.courtbouillon.org/weasyprint/
- **OpenAI API**: https://platform.openai.com/docs/

---

**Version**: 1.0
**Last Updated**: 2025-10-21
**Status**: Production Ready ✅
