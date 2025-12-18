import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kayıt | EV Charge",
  description: "Yeni hesap oluşturun",
};

export default function SignUp() {
  return <SignUpForm />;
}
