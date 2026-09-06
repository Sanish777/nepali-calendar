import re

with open('src/components/NepCalendarScrape.tsx', 'r') as f:
    code = f.read()

# Define the old block to replace
old_block_start = '{/* Header Controls */}'
old_block_end = '<div className="grid grid-cols-7'

idx_start = code.find(old_block_start)
idx_end = code.find(old_block_end)

if idx_start == -1 or idx_end == -1:
    print("Could not find the block to replace!")
    exit(1)

old_block = code[idx_start:idx_end]

new_block = """{/* Header Controls */}
          <div className="bg-white p-5 md:p-6 flex items-center justify-between border-b border-slate-100/80">
            <button 
              onClick={handlePrevMonth}
              className="p-2 rounded-full text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            
            <div className="text-center">
              {lang === 'np' ? (
                <>
                  <h2 className="text-[22px] md:text-3xl font-extrabold text-slate-900 font-np tracking-tight">
                    {data ? `${data.year_bs_np} ${data.month_name_np}` : '...'}
                  </h2>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1">
                    {data ? `${data.year_bs} ${data.month_name_en}` : '...'}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-[22px] md:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {data ? `${data.year_bs} ${data.month_name_en}` : '...'}
                  </h2>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 font-np tracking-widest mt-0.5 md:mt-1">
                    {data ? `${data.year_bs_np} ${data.month_name_np}` : '...'}
                  </p>
                </>
              )}
            </div>

            <button 
              onClick={handleNextMonth}
              className="p-2 rounded-full text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>

          """

code = code[:idx_start] + new_block + code[idx_end:]

with open('src/components/NepCalendarScrape.tsx', 'w') as f:
    f.write(code)

print("Calendar header updated successfully!")
