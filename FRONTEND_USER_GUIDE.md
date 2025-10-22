# 📱 AI Import - Frontend User Guide

## How to Import Documents (Step-by-Step)

### **Option 1: Using the Sidebar Menu**

1. **Log in** to your account
2. **Click "AI Import"** in the left sidebar (below "Invoicing")
3. You'll be taken to the import page at `/documents/import`

### **Option 2: Direct URL**

Navigate directly to: `http://localhost:5173/documents/import`

---

## 📤 Step 1: Upload Documents

### **Drag & Drop Method (Recommended)**

1. On the **AI Import** page, you'll see a large drop zone
2. **Drag your PDF files** from your computer
3. **Drop them** onto the zone
4. Multiple files are supported (up to 20 at once)

### **Click to Upload Method**

1. Click the **"Click to upload"** text in the drop zone
2. **Select one or more PDF files** from your computer
3. Click **Open**

### **Important Notes:**
- ✅ Only **PDF files** are accepted
- ✅ Both **French** (devis/facture) and **English** documents work
- ✅ You can upload **multiple documents** at once
- ❌ Image files (.jpg, .png) won't work (yet - only PDFs)

---

## ⏳ Step 2: Wait for AI Processing

### What Happens Automatically:

1. **Files are uploaded** to the server
2. **OpenAI processes** each document (10-30 seconds per document)
3. **AI extracts** all the data:
   - Customer name, email, company, address
   - Project name and description
   - All line items (tasks) with hours and pricing
   - Invoice/estimate numbers, dates, totals, tax

4. **Smart matching** runs:
   - Searches for existing customers by email/name
   - Finds similar projects for that customer
   - Calculates confidence scores

### You'll see:

- **Status changes** in the "Recent Documents" table below:
  - 🔵 **Uploaded** - Just uploaded, waiting to process
  - 🟡 **Processing** - AI is analyzing the document
  - 🟢 **Parsed** - Ready for review! Click "Review →"
  - ❌ **Error** - Something went wrong (see error message)

---

## 👁️ Step 3: Review Extracted Data

### Click "Review →" on a Parsed Document

You'll see the **Import Preview** page with 5 sections:

### **1. Customer Information**

Shows extracted customer data with:
- **Confidence Score** (green = high, yellow = medium, red = low)
- **Action Badge**:
  - 🆕 **Create New** - Will create a new customer
  - ✅ **Use Existing** - Found exact match (usually by email)
  - 🔄 **Merge** - Similar customer found, you decide

**If matched**, you'll see a blue box showing the existing customer.

### **2. Project Information**

Shows project details with:
- Project name and description
- Start/end dates (if found)
- **Action Badge**:
  - 🆕 **Create New** - Will create a new project
  - 🔄 **Merge Tasks** - Found similar project, will add tasks to it

**If matched**, you'll see which project it will use.

### **3. Tasks**

Table showing all line items extracted:
- Task name (from invoice line description)
- Hours/days (converted to hours if in days)
- Hourly rate
- Total amount

### **4. Invoice/Estimate Details**

Shows financial information:
- Document number
- Issue date / due date
- Subtotal
- Tax rate and amount
- **Total**
- Currency (EUR, USD, etc.)

### **5. Warnings & Conflicts**

At the top, you may see:

**🟡 Warnings** (yellow box):
- Low confidence scores
- Missing data (no email/phone)
- Tasks without time estimates
- Similar customers exist

**🔴 Conflicts** (red box):
- Email/phone mismatches
- Budget differences
- Closed project being updated

---

## ✅ Step 4: Approve or Reject

### **Approve Button** (Blue)

Click **"Approve & Import"** to create:
1. ✅ Customer (new or update existing)
2. ✅ Project (new or merge into existing)
3. ✅ All tasks with hours and pricing
4. ✅ Invoice or Estimate record

**This happens in the background** (takes 2-5 seconds).

After approval:
- You'll be redirected back to the import page
- Check your **Customers**, **Projects**, and **Invoicing** pages
- Everything will be there! 🎉

### **Reject Button** (Gray)

Click **"Reject"** if:
- ❌ Data is completely wrong
- ❌ Duplicate import
- ❌ You uploaded the wrong file

This discards the import permanently.

---

## 🎯 Real-World Examples

### **Example 1: New Customer Invoice**

**You upload:** `invoice_acme_corp_jan2024.pdf`

**AI extracts:**
```
Customer: Acme Corp
Email: contact@acmecorp.com
Project: Website Redesign
Tasks:
  - Design mockups: 20h @ $100/h = $2,000
  - Frontend development: 40h @ $100/h = $4,000
  - Backend API: 30h @ $100/h = $3,000
Total: $9,000
```

**Result after approval:**
- ✅ New customer "Acme Corp" created
- ✅ New project "Website Redesign" created
- ✅ 3 tasks created
- ✅ Invoice recorded

### **Example 2: Existing Customer, New Project**

**You upload:** `devis_acme_corp_mobile_app.pdf` (French estimate)

**AI detects:**
- 🔍 Customer exists (found by email: contact@acmecorp.com)
- 🆕 New project: "Mobile App Development"
- **Action**: Use existing customer, create new project

**Result after approval:**
- ✅ Linked to existing customer
- ✅ New project created for them
- ✅ All tasks added

### **Example 3: Similar Project Found**

**You upload:** `invoice_acme_website_phase2.pdf`

**AI detects:**
- 🔍 Customer exists: Acme Corp
- 🔍 Similar project found: "Website Redesign" (85% match)
- **Action**: Merge tasks into existing project

**Result after approval:**
- ✅ No new project created
- ✅ Tasks added to existing "Website Redesign" project
- ✅ Invoice linked to that project

---

## 🤖 Using the AI Estimate Assistant

### Generate Estimate from Description

**Coming in next phase!** You'll be able to:

1. Click **"Generate Estimate"** button
2. Describe your project in natural language:
   ```
   Build a mobile app for food delivery with iOS and Android.
   Customer needs MVP in 3 months. Budget around $50,000.
   ```
3. AI analyzes your **past projects** and suggests:
   - Task breakdown
   - Time estimates
   - Pricing based on your history
   - Total project cost

---

## 📊 Understanding Confidence Scores

| Score | Color | Meaning | Action |
|-------|-------|---------|--------|
| 90-100% | 🟢 Green | High confidence - data is likely accurate | Review quickly, approve |
| 70-89% | 🟡 Yellow | Medium confidence - some uncertainty | Review carefully |
| 0-69% | 🔴 Red | Low confidence - verify all fields | Manual review required |

---

## 🚨 Troubleshooting

### **"No preview available yet"**

**Cause:** Document is still processing
**Solution:** Wait 10-30 seconds and refresh the page

### **"Error" status on document**

**Causes:**
- Poor quality PDF scan
- Corrupted file
- Not an invoice/estimate

**Solution:**
- Check the error message in the table
- Try re-uploading with better quality PDF
- Contact support if issue persists

### **Low confidence scores everywhere**

**Causes:**
- Handwritten invoice
- Unusual format
- Missing critical information

**Solution:**
- You can still approve, but **verify all fields manually**
- Consider using a standard invoice template going forward

### **Customer/Project not matching correctly**

**Cause:** Different email or name spelling

**Solution:**
- In future versions, you'll be able to **edit the preview**
- For now, you can:
  1. Approve the import (creates new customer)
  2. Manually merge duplicates in the Customers page

---

## 💡 Tips for Best Results

### **1. Use Standard Invoice Templates**

The more consistent your invoices, the better the AI performs.

**Good Invoice Structure:**
```
Customer Details:
  - Company name
  - Contact name
  - Email address
  - Phone number
  - Full address

Line Items:
  - Clear description
  - Hours or days (quantity)
  - Hourly or daily rate
  - Line total

Totals:
  - Subtotal
  - Tax rate and amount
  - Grand total
```

### **2. Ensure High-Quality PDFs**

- ✅ Native PDFs (generated from software) work best
- ✅ High-resolution scans (300 DPI+) are good
- ❌ Low-quality scans or photos won't work well

### **3. Include Complete Information**

Make sure your invoices have:
- ✅ Customer email (critical for matching)
- ✅ Clear line item descriptions
- ✅ Time quantities (hours/days)
- ✅ Pricing information
- ✅ Dates (issue date, due date)

### **4. Batch Upload Similar Documents**

Upload multiple invoices for the same customer at once. The AI will:
- Match them all to the same customer
- Create projects or merge intelligently
- Save you even more time

### **5. Review Low Confidence Items**

Always review items with confidence < 80%:
- Check customer email
- Verify amounts
- Confirm hours match your expectations

---

## 🎬 Quick Start Workflow

**For your very first import:**

1. **Navigate** to "AI Import" in sidebar
2. **Upload** a clear PDF invoice (native PDF preferred)
3. **Wait** ~15 seconds for processing
4. **Click** "Review →" when status shows "Parsed"
5. **Verify** the extracted data looks correct
6. **Check** warnings/conflicts (if any)
7. **Click** "Approve & Import"
8. **Go to** Customers/Projects/Invoicing to see your new data!

**That's it!** 🎉

---

## 📈 What Gets Created

After approval, here's what you'll find:

### **In Customers Page** (`/customers`):
- New customer entry with all contact details
- Or linked to existing customer if match found

### **In Projects Page** (`/projects`):
- New project with name and description
- Or tasks added to existing project if match found
- Estimated budget set to invoice/estimate total
- Status: "Active"

### **In Tasks** (within project):
- All line items from invoice as tasks
- Status: "To Do"
- Hours and hourly rates populated
- Order preserved from document

### **In Invoicing Page** (`/invoicing`):
- New invoice or estimate record
- Linked to customer and project
- All financial details
- Status: "Draft" (you can mark as sent/paid later)

---

## 🔐 Privacy & Security

- ✅ Your PDFs are stored securely (S3 in production)
- ✅ OpenAI processes documents but **doesn't train on your data**
- ✅ All data is **isolated by user** (multi-tenant)
- ✅ You can delete imported documents anytime

---

## 📞 Need Help?

- **Documentation**: See `AI_IMPORT_README.md` for technical details
- **Logs**: Check browser console (F12) for errors
- **Backend logs**: `docker-compose logs backend celery_worker`

---

## 🚀 Coming Soon

Features in development:

- [ ] **Edit preview data** before approval
- [ ] **OCR for scanned images** (.jpg, .png)
- [ ] **Multi-page document** support
- [ ] **Email import** (forward invoices to import@yourdomain.com)
- [ ] **AI estimate generator** (describe project → get estimate)
- [ ] **Bulk operations** (approve 10 imports at once)
- [ ] **Custom templates** (train AI on your specific format)

---

**That's everything you need to know!** Start importing and save hours of manual data entry. 🎉
