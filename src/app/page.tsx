import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth/jwt";
import NepCalendarScrape from "@/components/NepCalendarScrape";

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
    <div className="min-h-screen pb-24 md:pb-16 flex flex-col bg-slate-50/50 pt-8 md:pt-12">
      <div className="flex-1 w-full">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <NepCalendarScrape />
        </div>
      </div>
    </div>
  );
}