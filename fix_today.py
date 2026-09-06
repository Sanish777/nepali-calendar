import re

with open('src/components/NepCalendarScrape.tsx', 'r') as f:
    code = f.read()

func_today = """
  const handleToday = () => {
    fetch(`/api/v1/calendar/today?api_key=${API_KEY}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setYearBs(json.data.bs.year);
          setMonthBs(json.data.bs.month);
        }
      });
  };
"""

code = code.replace('const handleDayClick = (dayBs: number) => {', func_today + '\n  const handleDayClick = (dayBs: number) => {')

# update button onClick
code = code.replace('setYearBs(null);\n                  setMonthBs(null);\n                  setSelectedDayBs(null);', 'handleToday();')

with open('src/components/NepCalendarScrape.tsx', 'w') as f:
    f.write(code)

print("Today function added!")
