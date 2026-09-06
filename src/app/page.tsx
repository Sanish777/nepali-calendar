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
    <div className="bg-transparent min-h-screen pt-8 pb-24 md:pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <NepCalendarScrape />
      </div>
    </div>
  );
}