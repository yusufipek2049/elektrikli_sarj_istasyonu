import { SignJWT, jwtVerify } from "jose";

type Role = "customer" | "admin";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET!);

export type AuthClaims = {
  sub: string;
  role: Role;
  email: string;
};

export async function signToken(claims: AuthClaims) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret());
  return payload as unknown as AuthClaims;
}
