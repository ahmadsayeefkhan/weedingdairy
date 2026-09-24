import { redirect } from "next/navigation";
import { currentUser, homeFor } from "@/lib/auth";
import Onboarding from "./Onboarding";

export default async function Home() {
  const u = await currentUser();
  if (u) redirect(u.role === "USER" && !u.onboarded ? "/setup" : homeFor(u.role));
  return <Onboarding />;
}
