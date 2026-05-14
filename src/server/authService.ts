import jwt from "jsonwebtoken";
import type { AuthUser } from "../shared/types";

interface JwtPayload {
  sub: string;
  displayName: string;
}

export class AuthService {
  constructor(private readonly jwtSecret: string) {}

  createToken(user: AuthUser): string {
    return jwt.sign(
      {
        sub: user.userId,
        displayName: user.displayName,
      } satisfies JwtPayload,
      this.jwtSecret,
      { expiresIn: "2h" },
    );
  }

  createDemoToken(displayName: string): string {
    const safeName = displayName.trim().slice(0, 24) || "Player";
    return this.createToken({
      userId: `demo-${safeName.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now()}`,
      displayName: safeName,
    });
  }

  verifyToken(token: string): AuthUser {
    const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;
    if (!decoded.sub || !decoded.displayName) {
      throw new Error("Invalid token payload.");
    }
    return {
      userId: decoded.sub,
      displayName: decoded.displayName,
    };
  }
}
