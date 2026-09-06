import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth/jwt";
import NepCalendarScrape from "@/components/NepCalendarScrape";
import HeroSection from "@/components/HeroSection";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("miti_token")?.value;
  if (token) {
    const session = verifyToken(token);
    if (session?.role === "ADMIN") {
      redirect("/admin");
    }
  }

  return (
    <div className="min-h-screen pb-24 md:pb-16 flex flex-col">
      <HeroSection />

      {/* Calendar Section */}
      <div className="flex-1 w-full bg-slate-50/50 pt-4 pb-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <NepCalendarScrape />
        </div>
      </div>
    </div>
  );
}