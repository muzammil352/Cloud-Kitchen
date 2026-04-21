import { Playfair_Display } from 'next/font/google'
import Link from 'next/link'
import { MobileNav } from '@/components/landing/MobileNav'

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

const painPoints = [
  {
    icon: '🧾',
    title: 'Orders lost in WhatsApp',
    desc: 'Phone orders, missed confirmations, no paper trail. Your team manages chaos instead of food.',
  },
  {
    icon: '📦',
    title: 'Inventory blind spots',
    desc: "You never know what's low until you've run out mid-service. Restocking is always reactive.",
  },
  {
    icon: '📣',
    title: 'No customer memory',
    desc: "You don't know who your regulars are or when they last ordered. Repeat business is left to luck.",
  },
]

const features = [
  {
    icon: '🛒',
    title: 'Smart Order Intake',
    desc: 'Customers order from your branded storefront. Every order hits your dashboard instantly.',
  },
  {
    icon: '📲',
    title: 'Email & WhatsApp Alerts',
    desc: 'You and your customer get notified the moment an order is placed or updated.',
  },
  {
    icon: '📦',
    title: 'Auto Inventory Deduction',
    desc: 'Ingredients deducted automatically on order confirmation based on your recipes.',
  },
  {
    icon: '⚠️',
    title: 'Low Stock Approval',
    desc: 'Get alerted before running out. Approve a supplier restock message with one click.',
  },
  {
    icon: '👥',
    title: 'Built-in CRM',
    desc: "Every customer's history and spend tracked automatically. No spreadsheets.",
  },
  {
    icon: '📊',
    title: 'Nightly Shift Summary',
    desc: 'At 11 PM, get a full summary of orders, revenue, and stock usage by email.',
  },
]

const steps = [
  {
    num: '01',
    title: 'Sign Up',
    desc: 'Your dashboard and customer storefront are ready the moment you sign up.',
  },
  {
    num: '02',
    title: 'Add Your Menu',
    desc: 'Add items, set prices, map ingredients to recipes. Takes 10 minutes.',
  },
  {
    num: '03',
    title: 'Share Your Link',
    desc: 'Send customers your link: cloudkitchen.app/your-kitchen. Orders start flowing.',
  },
]

export default function LandingPage() {
  return (
    <div className={`${playfair.variable} bg-white min-h-screen`}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-h1   { animation: fadeUp 0.5s ease-out 0.1s  both; }
        .anim-sub  { animation: fadeUp 0.5s ease-out 0.25s both; }
        .anim-ctas { animation: fadeUp 0.5s ease-out 0.4s  both; }
      `}</style>

      {/* ── NAVBAR ───────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white border-b border-[#e5e5e3]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <span className="font-[family-name:var(--font-playfair)] font-bold text-xl text-[#16a34a]">
              CloudKitchen
            </span>

            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-[#111110] border border-[#c9c9c6] rounded-[6px] hover:bg-[#f3f3f1] transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 text-sm font-medium text-white bg-[#16a34a] rounded-[6px] hover:bg-[#15803d] transition-colors"
              >
                Get Started Free
              </Link>
            </div>

            <MobileNav />
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="min-h-screen flex items-center pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left — copy */}
            <div>
              <h1 className="anim-h1 font-[family-name:var(--font-playfair)] text-4xl sm:text-5xl lg:text-6xl font-bold text-[#111110] leading-[1.15]">
                Your Cloud Kitchen,<br />Running on Autopilot.
              </h1>
              <p className="anim-sub mt-5 text-lg sm:text-xl text-[#6f6e6b] leading-relaxed max-w-lg">
                From order intake to inventory to customer follow-ups —
                CloudKitchen automates your operations so you can focus on the food.
              </p>
              <div className="anim-ctas mt-8 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="px-6 py-3 text-sm font-semibold text-white bg-[#16a34a] rounded-[6px] hover:bg-[#15803d] transition-colors"
                >
                  Start Free — No Credit Card
                </Link>
                <a
                  href="#how-it-works"
                  className="px-6 py-3 text-sm font-semibold text-[#111110] border border-[#c9c9c6] rounded-[6px] hover:bg-[#f3f3f1] transition-colors"
                >
                  See How It Works
                </a>
              </div>
              <p className="mt-4 text-sm text-[#a0a09d]">
                Built for cloud kitchens in Pakistan 🇵🇰
              </p>
            </div>

            {/* Right — CSS dashboard mockup (desktop only) */}
            <div className="hidden lg:block">
              <div className="bg-[#f9f9f8] border border-[#e5e5e3] rounded-xl p-5 shadow-sm max-w-sm ml-auto">
                {/* Stat boxes */}
                <div className="flex gap-3 mb-3">
                  <div className="flex-1 bg-white border border-[#e5e5e3] rounded-lg p-3">
                    <p className="text-xs text-[#a0a09d] mb-1">Today's Orders</p>
                    <p className="font-mono text-2xl font-bold text-[#111110]">24</p>
                  </div>
                  <div className="flex-1 bg-white border border-[#e5e5e3] rounded-lg p-3">
                    <p className="text-xs text-[#a0a09d] mb-1">Revenue</p>
                    <p className="font-mono text-xl font-bold text-[#16a34a]">Rs. 18,400</p>
                  </div>
                </div>
                {/* Order rows */}
                <div className="space-y-2">
                  {[
                    { name: 'Burger Hub', id: '#1042', status: 'Confirmed ✅' },
                    { name: 'Zinger Deal', id: '#1043', status: 'Preparing 🔄' },
                    { name: 'Chai + Fries', id: '#1044', status: 'Delivered 📦' },
                  ].map(order => (
                    <div
                      key={order.id}
                      className="bg-white border border-[#e5e5e3] rounded-lg px-3 py-2 text-sm flex items-center justify-between"
                    >
                      <span className="text-[#111110]">
                        {order.name}{' '}
                        <span className="font-mono text-xs text-[#a0a09d]">{order.id}</span>
                      </span>
                      <span className="text-xs whitespace-nowrap">{order.status}</span>
                    </div>
                  ))}
                </div>
                {/* Fake bottom bar */}
                <div className="mt-3 pt-3 border-t border-[#e5e5e3] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#16a34a]" />
                  <span className="text-xs text-[#a0a09d]">Live — auto-refreshing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PAIN POINTS ──────────────────────────────────── */}
      <section className="py-20 bg-[#f9f9f8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-center text-[#111110]">
            Running a kitchen is chaos. We fix that.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {painPoints.map(card => (
              <div
                key={card.title}
                className="bg-white border border-[#e5e5e3] rounded-xl p-6 shadow-sm"
              >
                <div className="text-4xl mb-4">{card.icon}</div>
                <h3 className="font-semibold text-[#111110] text-base mb-2">{card.title}</h3>
                <p className="text-sm text-[#6f6e6b] leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-center text-[#111110]">
            Everything you need. Nothing you don't.
          </h2>
          <p className="text-center text-[#6f6e6b] mt-2 text-base">
            One platform. Your entire operation.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {features.map(f => (
              <div
                key={f.title}
                className="border border-[#e5e5e3] rounded-xl p-6 hover:border-[#c9c9c6] transition-colors"
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-[#111110] mb-2">{f.title}</h3>
                <p className="text-sm text-[#6f6e6b] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section className="py-20 bg-[#f9f9f8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-center text-[#111110]">
            Live in minutes.
          </h2>
          <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
            {/* Dashed connecting line — desktop only */}
            <div
              aria-hidden
              className="hidden lg:block absolute border-t-2 border-dashed border-[#c9c9c6]"
              style={{ top: '2rem', left: 'calc(16.67% + 1rem)', right: 'calc(16.67% + 1rem)' }}
            />
            {steps.map(step => (
              <div key={step.num} className="relative text-center px-4">
                <div className="font-mono text-6xl font-bold text-[#16a34a] opacity-20 leading-none select-none">
                  {step.num}
                </div>
                <h3 className="font-semibold text-[#111110] text-lg mt-3 mb-2">{step.title}</h3>
                <p className="text-sm text-[#6f6e6b] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────── */}
      <section className="py-20 bg-[#16a34a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl font-bold text-white">
            Ready to automate your kitchen?
          </h2>
          <p className="mt-3 text-white/80 text-base">
            Free to start. No setup fees. No monthly commitment during beta.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block bg-white text-[#16a34a] font-semibold text-sm px-8 py-4 rounded-[6px] hover:bg-[#f0fdf4] transition-colors"
          >
            Create Your Kitchen — It&apos;s Free
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="py-8 bg-[#f3f3f1] border-t border-[#e5e5e3]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-[#a0a09d]">
            <span>© 2026 CloudKitchen. Built at LUMS.</span>
            <div className="flex gap-5">
              <Link href="/login" className="text-[#6f6e6b] hover:text-[#111110] transition-colors">
                Login
              </Link>
              <Link href="/signup" className="text-[#6f6e6b] hover:text-[#111110] transition-colors">
                Sign Up
              </Link>
            </div>
          </div>
          <p className="text-center text-xs mt-4 text-[#a0a09d]">
            A course project — not yet in commercial operation.
          </p>
        </div>
      </footer>
    </div>
  )
}
