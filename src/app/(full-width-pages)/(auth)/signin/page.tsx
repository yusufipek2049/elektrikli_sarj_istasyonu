import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giris | EV Charge",
  description: "Hesabiniza giris yapin",
};

export default function SignIn() {
  return <SignInForm />;
}
