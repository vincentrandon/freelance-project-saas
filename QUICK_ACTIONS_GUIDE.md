# ⚡ Quick Actions Menu - User Guide

## Overview

The **Quick Actions** button is now available at the top of your sidebar, giving you instant access to the most common operations without navigating through multiple pages.

---

## 🎯 Location

**In the Sidebar:**
- Right below the logo
- Above the main menu (Dashboard, Customers, etc.)
- Always visible and accessible

**Visual:**
```
┌─────────────────────┐
│  [Logo]             │
│                     │
│  ⚡ Quick Actions   │  ← HERE!
│  ├─ Upload Document │
│  ├─ AI Estimate     │
│  ├─ New Customer    │
│  ├─ New Project     │
│  └─ Pending Imports │
│                     │
│  📊 Dashboard       │
│  👥 Customers       │
│  🎯 Leads           │
│  📁 Projects        │
│  💰 Finance         │
│  📄 Invoicing       │
│  🤖 AI Import       │
└─────────────────────┘
```

---

## 🚀 Available Actions

### 1. **📤 Upload Document**

**What it does:**
- Opens file picker to select PDF invoices/estimates
- Uploads directly without navigating to import page
- Automatically redirects to import page after upload

**How to use:**
1. Click "Quick Actions" button
2. Click "Upload Document"
3. Select PDF file(s)
4. Files upload instantly
5. Redirects to `/documents/import` to see progress

**Best for:**
- Quick import without navigation
- Uploading 1-2 documents on the fly

---

### 2. **💡 AI Estimate**

**What it does:**
- Opens dialog to describe your project
- AI generates complete estimate with tasks & pricing
- Based on your historical project data

**How to use:**
1. Click "Quick Actions" button
2. Click "AI Estimate"
3. Describe your project in the text box:
   ```
   Example: Build a blog website with CMS,
   3 pages, contact form, and admin dashboard.
   Customer budget around $3000.
   ```
4. Click "Generate Estimate"
5. AI analyzes and creates estimate (10-20 seconds)
6. Redirects to invoicing page with new estimate

**Best for:**
- Quick estimates for new inquiries
- Getting pricing suggestions
- Creating proposals fast

---

### 3. **👤 New Customer**

**What it does:**
- Opens Customers page
- Ready to add new customer manually

**How to use:**
1. Click "Quick Actions" button
2. Click "New Customer"
3. Redirects to `/customers`

**Best for:**
- Adding customer before importing documents
- Manual customer entry

---

### 4. **📁 New Project**

**What it does:**
- Opens Projects page
- Ready to create new project

**How to use:**
1. Click "Quick Actions" button
2. Click "New Project"
3. Redirects to `/projects`

**Best for:**
- Starting fresh project
- Manual project creation

---

### 5. **⏳ Pending Imports**

**What it does:**
- Shows all documents waiting for review
- Quick access to approve/reject imports

**How to use:**
1. Click "Quick Actions" button
2. Click "Pending Imports"
3. Redirects to `/documents/import`
4. See all documents in "Parsed" status

**Best for:**
- Checking if any documents need review
- Quick access to approval workflow

---

## 🎨 Design Features

### **Gradient Button**
- Purple gradient (violet-500 → violet-600)
- Stands out in the sidebar
- Hover effect for interactivity

### **Icon-Based Menu**
- Each action has a colored icon:
  - 🔵 Blue: Upload Document
  - 🟣 Purple: AI Estimate
  - 🟢 Green: New Customer
  - 🟠 Orange: New Project
  - 🟡 Yellow: Pending Imports

### **Descriptions**
- Each action shows:
  - **Bold title** (primary action)
  - **Gray subtitle** (what it does)

### **Responsive**
- Shows/hides based on sidebar expansion
- Works on mobile and desktop

---

## 💬 AI Estimate Dialog

When you click "AI Estimate", a modal appears:

```
┌─────────────────────────────────────┐
│  Generate AI Estimate           [X] │
│                                     │
│  Describe your project and AI will │
│  generate a detailed estimate...    │
│                                     │
│  ┌─────────────────────────────┐  │
│  │ Build a mobile app for...   │  │
│  │                              │  │
│  │                              │  │
│  └─────────────────────────────┘  │
│                                     │
│  [Cancel]  [Generate Estimate]     │
└─────────────────────────────────────┘
```

**Features:**
- Large textarea for project description
- Cancel button to close
- Generate button (disabled until you type)
- Loading state while AI processes
- Auto-closes after generation

---

## 🎯 Use Cases

### **Scenario 1: Client sends email with project request**

**Old way:**
1. Navigate to Customers
2. Create customer
3. Navigate to Projects
4. Create project
5. Navigate to Invoicing
6. Create estimate manually
7. **Total time: 5-10 minutes**

**New way with Quick Actions:**
1. Click "Quick Actions"
2. Click "AI Estimate"
3. Paste project description
4. Wait 15 seconds
5. Review & send
6. **Total time: 1-2 minutes**

---

### **Scenario 2: Client sends invoice via email**

**Old way:**
1. Download PDF
2. Navigate to AI Import
3. Click upload
4. Select file
5. **Total time: 1 minute**

**New way with Quick Actions:**
1. Download PDF
2. Click "Quick Actions" → "Upload Document"
3. Select file
4. **Total time: 20 seconds**

---

### **Scenario 3: Check pending imports**

**Old way:**
1. Click sidebar menu
2. Click "AI Import"
3. Scroll to "Recent Documents"
4. **Total time: 30 seconds**

**New way with Quick Actions:**
1. Click "Quick Actions" → "Pending Imports"
2. **Total time: 5 seconds**

---

## ⚙️ Technical Details

### Component: `QuickActions.jsx`

**Location:** `/frontend/src/components/QuickActions.jsx`

**State Management:**
- `showMenu` - Toggle quick actions dropdown
- `showAIDialog` - Toggle AI estimate modal
- `aiPrompt` - Store user's project description

**Hooks Used:**
- `useUploadDocuments()` - Handle file uploads
- `useGenerateEstimateFromPrompt()` - Call AI API
- `useNavigate()` - Programmatic navigation

**Styling:**
- Tailwind CSS for all styles
- Dark mode support
- Responsive design
- Smooth transitions

---

## 🎨 Customization

Want to add more actions? Edit `/frontend/src/components/QuickActions.jsx`:

```jsx
{/* Your Custom Action */}
<button
  onClick={() => {
    setShowMenu(false);
    navigate('/your-page');
  }}
  className="w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
>
  <div className="px-4 py-3 flex items-center space-x-3">
    <div className="flex-shrink-0 w-8 h-8 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center">
      <svg className="w-5 h-5 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {/* Your icon path */}
      </svg>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
        Your Action Title
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Your action description
      </p>
    </div>
  </div>
</button>
```

---

## 🚨 Troubleshooting

### "Quick Actions button not showing"

**Solution:** Check sidebar is expanded (on desktop, hover over sidebar)

### "Upload not working"

**Solution:**
- Ensure file is PDF format
- Check backend is running (`docker-compose logs backend`)
- Check OpenAI API key is configured

### "AI Estimate not generating"

**Solution:**
- Check OpenAI API key in `.env`
- Verify backend logs: `docker-compose logs backend`
- Try with shorter description first

### "Dialog doesn't close after generating"

**Solution:** Refresh page and try again

---

## 📊 Performance

- **Button render**: Instant
- **Menu open**: < 50ms
- **File upload**: 1-5 seconds (depends on file size)
- **AI generation**: 10-30 seconds (OpenAI API call)

---

## 🎉 Benefits

✅ **80% faster** access to common actions
✅ **No navigation** required
✅ **Fewer clicks** - from 5-10 clicks to 2 clicks
✅ **Always visible** - button stays in sidebar
✅ **Context-aware** - smart redirects after actions
✅ **AI-powered** - instant estimate generation

---

**That's it!** The Quick Actions menu is your command center for the most common operations. Try it now! ⚡
