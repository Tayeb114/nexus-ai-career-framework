import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import DashboardView from "./_component/dashboard-view";
import { getUserOnboardingStatus } from "@/actions/user";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { isOnboarded } = await getUserOnboardingStatus();
  
  if (!isOnboarded) {
    redirect("/onboarding");
  }

  const { userId } = await auth();
  const user = await db.user.findUnique({
    where: { clerkUserId: userId }
  });

  return (
    <div className="container mx-auto">
      <DashboardView 
        userSkills={user?.skills || []} 
        defaultIndustry={user?.industry || "Software Engineering"} 
      />
    </div>
  );
}
