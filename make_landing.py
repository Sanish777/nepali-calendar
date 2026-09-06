import re

with open('src/app/page.tsx', 'r') as f:
    code = f.read()

# Replace the barebones return with a proper landing page
old_return = """  return (
    <div className="bg-transparent min-h-screen pt-8 pb-24 md:pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <NepCalendarScrape />
      </div>
    </div>
  );"""

new_return = """  return (
    <div className="min-h-screen pb-24 md:pb-16 flex flex-col">
      {/* Hero Section */}
      <div className="relative pt-16 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] bg-center opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 border border-primary/20">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            Miti API is Live
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto mb-6 leading-tight">
            The Standard Calendar API for <span className="text-primary">Modern Developers</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            High-performance REST API for Bikram Sambat (BS) to AD conversion, accurate tithi, panchanga, festivals, and embeddable Nepali calendar widgets.
          </p>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="flex-1 w-full bg-slate-50/50 pt-4 pb-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <NepCalendarScrape />
        </div>
      </div>
    </div>
  );"""

if old_return in code:
    code = code.replace(old_return, new_return)
    with open('src/app/page.tsx', 'w') as f:
        f.write(code)
    print("Landing page upgraded!")
else:
    print("Could not find the old return block!")
