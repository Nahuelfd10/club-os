# 🤖 AI_GUIDELINES.md — Club OS

## 🎯 Purpose

This file defines how any AI agent (Claude, Cursor, or others) must behave when working on this codebase.

It ensures:

* consistency
* safety
* maintainability
* portability across AI tools

---

## 📚 MANDATORY FIRST STEP (CRITICAL)

Before making ANY change:

1. Read:

   * `docs/CONTEXTO_APLICACION.md`
   * `README.md`

2. Understand:

   * current features
   * architecture
   * data model
   * known issues

👉 DO NOT proceed without this.

---

## 🧠 SOURCE OF TRUTH

* The **codebase is the ultimate source of truth**
* Documentation must reflect the code

If inconsistencies are found:

* fix the documentation
* OR raise the issue before proceeding

---

## 🔄 DOCUMENTATION IS PART OF THE SYSTEM

Whenever you modify:

* features
* flows
* database
* architecture
* integrations

You MUST:

* update `docs/CONTEXTO_APLICACION.md`
* keep documentation aligned with code

Failure to do this = incomplete task

---

## ⚙️ DEVELOPMENT PRINCIPLES

* Prefer simplicity over complexity
* Avoid over-engineering
* Reuse existing patterns
* Maintain consistency with current structure
* Build for real use cases (not hypothetical ones)
* Keep UX clear and minimal

---

## 🧩 BUSINESS RULES (DO NOT BREAK)

* A member cannot pay the same billing period twice
* Payments may be for past or future periods
* Debt is calculated dynamically (never persisted as truth)
* Charges can be per-member or global
* `club_settings` represents club configuration

If a change affects these rules:
→ explicitly validate and document it

---

## 🛠️ HOW TO WORK (CODE MODE)

You are allowed to:

* edit code
* create new files
* refactor existing logic
* modify database (WITH RULES BELOW)

But you MUST:

* understand existing code before changing it
* avoid unnecessary large refactors
* keep changes minimal and focused

---

## 🗄️ DATABASE RULES (CRITICAL)

* NEVER assume DB structure if not confirmed in code or migrations
* ALL DB changes MUST be reflected in `supabase/migrations/`
* If schema inconsistencies are detected:
  → STOP and flag them

When modifying DB:

* create or update migration files
* keep naming consistent
* ensure backward compatibility when possible

---

## 🔐 SECURITY RULES

* DO NOT modify Row Level Security (RLS) policies without explicit reasoning
* Be aware the app uses Supabase anon key in frontend
* Avoid introducing security risks

If a change impacts security:
→ explicitly explain it

---

## ⚠️ HIGH-RISK AREAS

Be extra careful with:

* payments logic
* charge generation
* debt calculations
* Supabase RPC usage
* anything involving money

---

## 🚫 WHAT NOT TO DO

* Do not rewrite large parts of the system without justification
* Do not introduce new patterns if an existing one works
* Do not ignore documentation
* Do not leave documentation outdated
* Do not guess database structures

---

## 🧾 OUTPUT / CHANGE REPORT

After completing a task, ALWAYS provide:

1. What was done (short explanation)
2. Files modified
3. Database impact (if any)
4. Documentation updated (yes/no + what)

---

## 🔄 CONTINUOUS IMPROVEMENT

If you detect:

* dead code
* inconsistencies
* duplication
* unclear structure

You MAY propose improvements, but:

* do not apply them blindly
* do not break existing functionality

---

## 🧠 MENTAL MODEL

Act as a **senior developer inside an existing product**, not as a code generator.

* Understand before acting
* Respect the system
* Keep it clean
* Keep it consistent

---

## 🚀 FINAL GOAL

Maintain a codebase that is:

* reliable
* understandable
* scalable
* fully transferable between AI tools and developers

---

# END OF FILE
