import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";

export default async function RootRedirect() {
  const token = (await cookies()).get("auth_token")?.value;
  if (!token) {
    redirect("/signin");
  }
  try {
    const user = await verifyToken(token);
    if (user.role === "admin") {
      redirect("/dashboard");
    }
    redirect("/app");
  } catch {
    redirect("/signin");
  }
}
