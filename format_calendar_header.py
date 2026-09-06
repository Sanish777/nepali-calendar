import re

with open('src/components/NepCalendarScrape.tsx', 'r') as f:
    code = f.read()

old_block_start = '{/* Header Controls */}'
old_block_end = '<div className="grid grid-cols-7'

idx_start = code.find(old_block_start)
idx_end = code.find(old_block_end)

new_block = """{/* Header Controls */}
          <div className="bg-white px-6 py-5 flex flex-col sm:flex-row items-center justify-between border-b border-slate-100/80 gap-4">
            
            <div className="flex items-center gap-4">
              <div className="flex flex-col text-left">
                {lang === 'np' ? (
                  <>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 font-np tracking-tight">
                      {data ? `${data.year_bs_np} ${data.month_name_np}` : '...'}
                    </h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {data ? `${data.year_bs} ${data.month_name_en}` : '...'}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                      {data ? `${data.year_bs} ${data.month_name_en}` : '...'}
                    </h2>
                    <p className="text-[11px] font-bold text-slate-400 font-np tracking-widest mt-0.5">
                      {data ? `${data.year_bs_np} ${data.month_name_np}` : '...'}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1">
              <button 
                onClick={handlePrevMonth}
                className="p-1.5 md:p-2 rounded-md text-slate-500 hover:text-primary hover:bg-white transition-colors hover:shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="w-px h-5 bg-slate-200 mx-1"></div>
              
              <button 
                onClick={() => {
                  setYearBs(null);
                  setMonthBs(null);
                  setSelectedDayBs(null);
                }}
                className={`px-4 py-1.5 md:py-2 text-[13px] font-bold rounded-md transition-colors hover:bg-white hover:text-primary hover:shadow-sm ${lang === 'np' ? 'font-np' : ''} text-slate-600`}
              >
                {lang === 'np' ? 'आज' : 'Today'}
              </button>
              
              <div className="w-px h-5 bg-slate-200 mx-1"></div>

              <button 
                onClick={handleNextMonth}
                className="p-1.5 md:p-2 rounded-md text-slate-500 hover:text-primary hover:bg-white transition-colors hover:shadow-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

          </div>

          """

code = code[:idx_start] + new_block + code[idx_end:]

with open('src/components/NepCalendarScrape.tsx', 'w') as f:
    f.write(code)

print("Calendar header reformatted successfully!")
