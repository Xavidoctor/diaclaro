import { describe, expect, it } from "vitest";
import {
  enlaceOpcional,
  normalizarEnlace,
  sitioDeEnlace,
  textoBotonEnlace,
  tipoDeEnlace,
} from "./enlaces";

describe("normalizarEnlace", () => {
  it("vacío = sin enlace", () => {
    expect(normalizarEnlace("")).toBeNull();
    expect(normalizarEnlace("   ")).toBeNull();
    expect(normalizarEnlace(null)).toBeNull();
  });

  it("deja igual un enlace completo", () => {
    expect(normalizarEnlace(" https://www.youtube.com/watch?v=abc ")).toBe(
      "https://www.youtube.com/watch?v=abc",
    );
  });

  it("añade https:// si falta", () => {
    expect(normalizarEnlace("youtube.com/watch?v=abc")).toBe(
      "https://youtube.com/watch?v=abc",
    );
    expect(normalizarEnlace("www.ivoox.com/podcast")).toBe(
      "https://www.ivoox.com/podcast",
    );
  });

  it("rechaza lo que no es un enlace web", () => {
    expect(normalizarEnlace("mi podcast favorito")).toBe("");
    expect(normalizarEnlace("javascript:alert(1)")).toBe("");
    expect(normalizarEnlace("ftp://ejemplo.com")).toBe("");
    expect(normalizarEnlace("https://localhost")).toBe("");
  });
});

describe("enlaceOpcional", () => {
  it("acepta vacío y enlaces", () => {
    expect(enlaceOpcional.parse("")).toBeNull();
    expect(enlaceOpcional.parse("vimeo.com/1")).toBe("https://vimeo.com/1");
  });

  it("da un error claro si no es un enlace", () => {
    const r = enlaceOpcional.safeParse("hola");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/no es válido/);
  });

  it("rechaza enlaces larguísimos", () => {
    const r = enlaceOpcional.safeParse(`https://a.com/${"x".repeat(2000)}`);
    expect(r.success).toBe(false);
  });
});

describe("tipo y texto del botón", () => {
  it("reconoce vídeos y audios", () => {
    expect(tipoDeEnlace("https://youtu.be/abc")).toBe("video");
    expect(tipoDeEnlace("https://m.youtube.com/watch?v=1")).toBe("video");
    expect(tipoDeEnlace("https://open.spotify.com/episode/1")).toBe("audio");
    expect(tipoDeEnlace("https://podcasts.apple.com/es/podcast/x")).toBe(
      "audio",
    );
    expect(tipoDeEnlace("https://campus.uni.es/clase")).toBe("web");
    // Que el nombre se parezca no basta.
    expect(tipoDeEnlace("https://notyoutube.com")).toBe("web");
  });

  it("pone el texto según el tipo", () => {
    expect(textoBotonEnlace("https://youtu.be/abc")).toBe("Ver vídeo");
    expect(textoBotonEnlace("https://open.spotify.com/x")).toBe("Escuchar");
    expect(textoBotonEnlace("https://ejemplo.com")).toBe("Abrir enlace");
  });

  it("enseña el sitio sin www", () => {
    expect(sitioDeEnlace("https://www.ivoox.com/x")).toBe("ivoox.com");
  });
});
