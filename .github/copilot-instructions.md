# Repository Coding Rules & Guidelines

## Supabase Rules
- Do not manually store passwords; always use Supabase Auth (`supabase.auth.signUp`, `supabase.auth.signInWithPassword`).
- Never expose the Secret Key / Service Role Key on the frontend. Use public/anon keys stored in `.env.local`.

## PolyU Brand Design System
All UI components and pages must adhere strictly to these PolyU brand guidelines:

- **Primary Color (PolyU Brick Red):** `#A21942` (`bg-[#A21942]`, `text-[#A21942]`)
- **Primary Hover / Active:** `#801333` (`hover:bg-[#801333]`)
- **Secondary (Dark Slate/Charcoal):** `#262626` (`bg-[#262626]`, `text-[#262626]`)
- **Background Accent (Light Grey):** `#F8F9FA` (`bg-slate-50` or `#F8F9FA`)
- **Card Borders / Dividers:** `#E5E7EB` (`border-gray-200`)
- **Success / Progress Green:** `#10B981` (`bg-emerald-500`)

Do not substitute generic blue, violet, orange, lime, or dark-mode palettes for the PolyU palette. Use the tokens above consistently for brand, structure, and progress states; introduce another color only when it is required for a clearly labeled semantic state and it passes contrast checks.

### Typography & Component Specs
- **Font Family:** Sans-serif (Inter, system-ui, or Tailwind default sans).
- **Layout Grid:** Single-page responsiveness using Tailwind CSS. Max content width: `max-w-7xl mx-auto px-4`.
- **Primary Buttons:** `bg-[#A21942] text-white hover:bg-[#801333] transition-colors rounded-md px-4 py-2 font-medium`
- **Cards:** `bg-white rounded-lg border border-gray-200 shadow-sm p-6`