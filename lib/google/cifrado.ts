import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

// Cifra el permiso de Google (refresh token) antes de guardarlo en Supabase.
// Así, aunque alguien viera la tabla, no podría usarlo: la clave para
// descifrarlo sale del secreto de Google, que solo está en Vercel.
//
// Se usa AES-256-GCM, un cifrado estándar que además detecta si alguien
// ha tocado el texto cifrado. Las pruebas están en cifrado.test.ts.

const VERSION = "v1";

function clave(secreto: string): Buffer {
  if (!secreto) throw new Error("Falta el secreto para cifrar.");
  return Buffer.from(
    hkdfSync("sha256", secreto, "diaclaro", "permiso-google-calendar", 32),
  );
}

export function cifrar(texto: string, secreto: string): string {
  const iv = randomBytes(12);
  const cifrador = createCipheriv("aes-256-gcm", clave(secreto), iv);
  const datos = Buffer.concat([cifrador.update(texto, "utf8"), cifrador.final()]);
  const sello = cifrador.getAuthTag();
  return [VERSION, iv, sello, datos]
    .map((p) => (typeof p === "string" ? p : p.toString("base64url")))
    .join(".");
}

// Devuelve null si no se puede descifrar (secreto cambiado o texto roto).
export function descifrar(cifrado: string, secreto: string): string | null {
  const [version, iv, sello, datos] = cifrado.split(".");
  if (version !== VERSION || !iv || !sello || !datos) return null;
  try {
    const descifrador = createDecipheriv(
      "aes-256-gcm",
      clave(secreto),
      Buffer.from(iv, "base64url"),
    );
    descifrador.setAuthTag(Buffer.from(sello, "base64url"));
    return Buffer.concat([
      descifrador.update(Buffer.from(datos, "base64url")),
      descifrador.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
