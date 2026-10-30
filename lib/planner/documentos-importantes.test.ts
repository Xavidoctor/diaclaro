import { describe, expect, it } from "vitest";
import {
  comprobarArchivo,
  cuerpoSubida,
  filtrarDocumentos,
  leerDocumentoDrive,
  leerTipo,
  metadatosSubida,
  nombreParaGuardar,
  type DocumentoImportante,
} from "./documentos-importantes";

const MB = 1024 * 1024;

describe("leerTipo", () => {
  it("acepta los tipos conocidos y si no, «otros»", () => {
    expect(leerTipo("identidad")).toBe("identidad");
    expect(leerTipo("raro")).toBe("otros");
    expect(leerTipo(undefined)).toBe("otros");
  });
});

describe("comprobarArchivo", () => {
  it("acepta fotos y PDF", () => {
    expect(
      comprobarArchivo({ name: "a.jpg", type: "image/jpeg", size: MB }, 4),
    ).toEqual({ ok: true });
    expect(
      comprobarArchivo({ name: "a.pdf", type: "application/pdf", size: MB }, 4)
        .ok,
    ).toBe(true);
  });

  it("rechaza otros tipos, vacíos y demasiado grandes", () => {
    expect(
      comprobarArchivo({ name: "a.zip", type: "application/zip", size: 1 }, 4)
        .ok,
    ).toBe(false);
    expect(
      comprobarArchivo({ name: "a.png", type: "image/png", size: 0 }, 4).ok,
    ).toBe(false);
    expect(
      comprobarArchivo({ name: "a.png", type: "image/png", size: 5 * MB }, 4),
    ).toEqual({
      ok: false,
      mensaje: "El archivo es muy grande. Como mucho, 4 MB.",
    });
  });
});

describe("nombreParaGuardar", () => {
  it("usa tu título con la extensión del archivo", () => {
    expect(nombreParaGuardar(" DNI por delante ", "IMG_2031.jpg")).toBe(
      "DNI por delante.jpg",
    );
    expect(nombreParaGuardar("Billete.pdf", "x.pdf")).toBe("Billete.pdf");
  });

  it("si no escribes nada, usa el nombre del archivo", () => {
    expect(nombreParaGuardar("", "Screenshot_2026.png")).toBe(
      "Screenshot_2026.png",
    );
    expect(nombreParaGuardar("  ", "")).toBe("documento");
  });
});

describe("metadatosSubida y cuerpoSubida", () => {
  it("marca el archivo como de DíaClaro, con su tipo y carpeta", () => {
    expect(
      metadatosSubida({ nombre: "DNI.jpg", tipo: "identidad", carpeta: "c1" }),
    ).toEqual({
      name: "DNI.jpg",
      parents: ["c1"],
      appProperties: { diaclaro: "importante", tipo: "identidad" },
    });
  });

  it("junta los datos y el archivo en el formato de Drive", async () => {
    const meta = metadatosSubida({
      nombre: "a.png",
      tipo: "otros",
      carpeta: "c1",
    });
    const { cuerpo, tipoContenido } = cuerpoSubida(
      meta,
      new Blob(["FOTO"]),
      "image/png",
    );
    const limite = tipoContenido.split("boundary=")[1];
    const texto = await cuerpo.text();
    expect(tipoContenido.startsWith("multipart/related; boundary=")).toBe(true);
    expect(texto).toContain(JSON.stringify(meta));
    expect(texto).toContain("Content-Type: image/png\r\n\r\nFOTO");
    expect(texto.endsWith(`--${limite}--`)).toBe(true);
  });
});

describe("leerDocumentoDrive", () => {
  const archivo = {
    id: "1aB-c_D",
    name: "DNI.jpg",
    mimeType: "image/jpeg",
    webViewLink: "https://drive.google.com/file/d/1aB-c_D/view",
    thumbnailLink: "https://lh3.googleusercontent.com/abc",
    createdTime: "2026-10-30T10:00:00Z",
    appProperties: { diaclaro: "importante", tipo: "identidad" },
  };

  it("se queda con lo necesario", () => {
    expect(leerDocumentoDrive(archivo)).toEqual({
      id: "1aB-c_D",
      nombre: "DNI.jpg",
      tipo: "identidad",
      mime: "image/jpeg",
      enlace: archivo.webViewLink,
      miniatura: archivo.thumbnailLink,
      creado: archivo.createdTime,
    });
  });

  it("descarta enlaces raros y se salta miniaturas de fuera de Google", () => {
    expect(
      leerDocumentoDrive({ ...archivo, webViewLink: "https://malo.com" }),
    ).toBeNull();
    expect(leerDocumentoDrive({ ...archivo, id: "../x" })).toBeNull();
    expect(leerDocumentoDrive(null)).toBeNull();
    expect(
      leerDocumentoDrive({ ...archivo, thumbnailLink: "https://malo.com/a" })
        ?.miniatura,
    ).toBeNull();
  });
});

describe("filtrarDocumentos", () => {
  const doc = (nombre: string, tipo: DocumentoImportante["tipo"]) => ({
    id: nombre,
    nombre,
    tipo,
    mime: "image/png",
    enlace: "https://drive.google.com/x",
    miniatura: null,
    creado: "",
  });
  const docs = [
    doc("DNI delante.jpg", "identidad"),
    doc("Billete avión Roma.pdf", "viajes"),
    doc("Entrada concierto.png", "entradas"),
  ];

  it("busca sin importar tildes ni mayúsculas", () => {
    expect(
      filtrarDocumentos(docs, { busqueda: "AVION roma" }).map((d) => d.id),
    ).toEqual(["Billete avión Roma.pdf"]);
  });

  it("encuentra también por el nombre del tipo", () => {
    expect(filtrarDocumentos(docs, { busqueda: "viajes" })).toHaveLength(1);
  });

  it("filtra por tipo e ignora tipos desconocidos", () => {
    expect(filtrarDocumentos(docs, { tipo: "entradas" })).toHaveLength(1);
    expect(filtrarDocumentos(docs, { tipo: "raro" })).toHaveLength(3);
  });
});
