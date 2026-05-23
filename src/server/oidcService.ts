import crypto from "crypto";
import type { OidcConfig } from "./config";
import type { TransientStore } from "./transientStore";

interface OidcMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  userinfo_endpoint?: string;
}

interface OidcTokenResponse {
  access_token?: string;
  id_token?: string;
  token_type?: string;
}

interface OidcAuthorizationState {
  codeVerifier: string;
  nonce: string;
  expiresAt: number;
}

interface OidcJwtHeader {
  alg?: string;
  kid?: string;
}

interface OidcClaims {
  aud?: string | string[];
  email?: string;
  email_verified?: boolean;
  exp?: number;
  iat?: number;
  iss?: string;
  name?: string;
  nonce?: string;
  preferred_username?: string;
  sub?: string;
}

interface JwksDocument {
  keys?: OidcJsonWebKey[];
}

interface OidcJsonWebKey extends JsonWebKey {
  kid?: string;
}

export interface OidcUserProfile {
  provider: string;
  providerAccountId: string;
  email: string;
  emailVerified: boolean | null;
  displayName: string;
  usernameHint: string;
}

const DISCOVERY_CACHE_MS = 60 * 60 * 1000;
const AUTH_STATE_TTL_MS = 10 * 60 * 1000;

export class OidcService {
  private metadataCache: { value: OidcMetadata; expiresAt: number } | null = null;
  private jwksCache: { value: OidcJsonWebKey[]; expiresAt: number } | null = null;

  constructor(
    private readonly config: OidcConfig,
    private readonly transientStore: TransientStore,
  ) {}

  get providerName(): string {
    return this.config.providerName;
  }

  async createAuthorizationUrl(): Promise<string> {
    const metadata = await this.loadMetadata();
    const state = randomUrlToken(32);
    const codeVerifier = randomUrlToken(64);
    const nonce = randomUrlToken(32);
    const codeChallenge = base64Url(crypto.createHash("sha256").update(codeVerifier).digest());

    await this.transientStore.setJson(this.authorizationStateKey(state), {
      codeVerifier,
      nonce,
      expiresAt: Date.now() + AUTH_STATE_TTL_MS,
    }, AUTH_STATE_TTL_MS);

    const url = new URL(metadata.authorization_endpoint);
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("scope", this.config.scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    return url.toString();
  }

  async exchangeCode(code: string, state: string): Promise<OidcUserProfile> {
    const metadata = await this.loadMetadata();
    const pending = await this.transientStore.takeJson<OidcAuthorizationState>(this.authorizationStateKey(state));
    if (!pending || pending.expiresAt < Date.now()) {
      throw new Error("SSO request expired. Start the sign-in flow again.");
    }

    const tokenResponse = await fetch(metadata.token_endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code_verifier: pending.codeVerifier,
      }),
    });
    const tokens = (await tokenResponse.json().catch(() => null)) as OidcTokenResponse | null;
    if (!tokenResponse.ok || !tokens?.id_token) {
      throw new Error("Unable to exchange the SSO authorization code.");
    }

    const claims = await this.verifyIdToken(tokens.id_token, pending.nonce, metadata);
    const enrichedClaims = await this.enrichClaims(claims, metadata.userinfo_endpoint, tokens.access_token);
    const email = normalizeEmail(enrichedClaims.email);
    if (!email) {
      throw new Error("The identity provider did not return an email address.");
    }

    const displayName = buildDisplayName(enrichedClaims);
    return {
      provider: this.config.providerId,
      providerAccountId: enrichedClaims.sub ?? "",
      email,
      emailVerified:
        typeof enrichedClaims.email_verified === "boolean" ? enrichedClaims.email_verified : null,
      displayName,
      usernameHint: buildUsernameHint(enrichedClaims, email),
    };
  }

  private async enrichClaims(
    claims: OidcClaims,
    userinfoEndpoint: string | undefined,
    accessToken: string | undefined,
  ): Promise<OidcClaims> {
    if ((claims.email && claims.name) || !userinfoEndpoint || !accessToken) {
      return claims;
    }

    const response = await fetch(userinfoEndpoint, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      return claims;
    }
    const userinfo = (await response.json().catch(() => null)) as OidcClaims | null;
    if (!userinfo) {
      return claims;
    }
    return {
      ...userinfo,
      ...claims,
    };
  }

  private async verifyIdToken(token: string, expectedNonce: string, metadata: OidcMetadata): Promise<OidcClaims> {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new Error("Malformed ID token.");
    }

    const header = parseTokenPart<OidcJwtHeader>(encodedHeader);
    const claims = parseTokenPart<OidcClaims>(encodedPayload);
    const signature = Buffer.from(encodedSignature, "base64url");
    const signingInput = Buffer.from(`${encodedHeader}.${encodedPayload}`);
    const key = await this.getVerificationKey(header, metadata);
    const algorithm = verificationAlgorithm(header.alg);

    const verified = await crypto.webcrypto.subtle.verify(algorithm, key, signature, signingInput);
    if (!verified) {
      throw new Error("Invalid ID token signature.");
    }

    validateClaims(claims, metadata.issuer, this.config.clientId, expectedNonce);
    if (!claims.sub) {
      throw new Error("ID token is missing the subject claim.");
    }
    return claims;
  }

  private async getVerificationKey(header: OidcJwtHeader, metadata: OidcMetadata): Promise<CryptoKey> {
    const jwk = await this.getJwk(header.kid, metadata.jwks_uri);
    if (jwk.kty !== "RSA" || !jwk.n || !jwk.e) {
      throw new Error("Unsupported JWKS key type.");
    }
    return crypto.webcrypto.subtle.importKey(
      "jwk",
      {
        ...jwk,
        alg: header.alg ?? "RS256",
        ext: true,
      },
      verificationAlgorithm(header.alg),
      false,
      ["verify"],
    );
  }

  private async getJwk(kid: string | undefined, jwksUri: string): Promise<OidcJsonWebKey> {
    const now = Date.now();
    if (!this.jwksCache || this.jwksCache.expiresAt < now) {
      const response = await fetch(jwksUri, { headers: { accept: "application/json" } });
      const body = (await response.json().catch(() => null)) as JwksDocument | null;
      if (!response.ok || !body?.keys?.length) {
        throw new Error("Unable to load the OIDC signing keys.");
      }
      this.jwksCache = {
        value: body.keys,
        expiresAt: now + DISCOVERY_CACHE_MS,
      };
    }

    const matchingKey = this.jwksCache.value.find((candidate) => candidate.kid === kid) ?? this.jwksCache.value[0];
    if (!matchingKey) {
      throw new Error("No matching OIDC signing key was found.");
    }
    return matchingKey;
  }

  private async loadMetadata(): Promise<OidcMetadata> {
    const now = Date.now();
    if (this.metadataCache && this.metadataCache.expiresAt > now) {
      return this.metadataCache.value;
    }

    const discoveryUrl = `${this.config.issuerUrl}/.well-known/openid-configuration`;
    const response = await fetch(discoveryUrl, { headers: { accept: "application/json" } });
    const metadata = (await response.json().catch(() => null)) as OidcMetadata | null;
    if (
      !response.ok ||
      !metadata?.issuer ||
      !metadata.authorization_endpoint ||
      !metadata.token_endpoint ||
      !metadata.jwks_uri
    ) {
      throw new Error("Unable to load OIDC discovery metadata.");
    }

    this.metadataCache = {
      value: metadata,
      expiresAt: now + DISCOVERY_CACHE_MS,
    };
    return metadata;
  }

  private authorizationStateKey(state: string): string {
    return `oidc:state:${this.config.providerId}:${state}`;
  }
}

function buildDisplayName(claims: OidcClaims): string {
  const candidate =
    claims.name?.trim() ||
    claims.preferred_username?.split("@")[0]?.trim() ||
    claims.email?.split("@")[0]?.trim() ||
    "Player";
  return candidate.slice(0, 24) || "Player";
}

function buildUsernameHint(claims: OidcClaims, email: string): string {
  return (
    claims.preferred_username?.trim() ||
    claims.email?.split("@")[0]?.trim() ||
    claims.name?.trim() ||
    email.split("@")[0] ||
    "player"
  );
}

function validateClaims(
  claims: OidcClaims,
  issuer: string,
  clientId: string,
  expectedNonce: string,
): void {
  if (!claims.iss || normalizeUrl(claims.iss) !== normalizeUrl(issuer)) {
    throw new Error("Unexpected OIDC issuer.");
  }

  const audience = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
  if (!audience.includes(clientId)) {
    throw new Error("Unexpected OIDC audience.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!claims.exp || claims.exp <= nowSeconds) {
    throw new Error("The ID token has expired.");
  }

  if (claims.nonce && claims.nonce !== expectedNonce) {
    throw new Error("Unexpected OIDC nonce.");
  }
}

function verificationAlgorithm(alg: string | undefined): RsaHashedImportParams {
  switch (alg) {
    case undefined:
    case "RS256":
      return { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
    case "RS384":
      return { name: "RSASSA-PKCS1-v1_5", hash: "SHA-384" };
    case "RS512":
      return { name: "RSASSA-PKCS1-v1_5", hash: "SHA-512" };
    default:
      throw new Error(`Unsupported OIDC signing algorithm: ${alg}`);
  }
}

function parseTokenPart<T>(encoded: string): T {
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T;
}

function randomUrlToken(bytes: number): string {
  return base64Url(crypto.randomBytes(bytes));
}

function base64Url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

function normalizeUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeEmail(value: string | undefined): string {
  if (!value) {
    return "";
  }
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
