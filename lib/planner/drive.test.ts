import { describe, expect, it } from "vitest";
import { direccionDeVuelta, prepararDocumentos, tipoDocumento } from "./drive";

const doc = {
  id: "1AbC-d_E",
  name: " Apuntes tema 1 ",
  url: "https://docs.google.com/document/d/1AbC-d_E/edit",
  mimeType: "application/vnd.google-apps.document",
};

describe("prepararDocumentos", () => {
  it("se queda con el id, el nombre, el enlace y el tipo", () => {
    expect(prepararDocumentos([doc])).toEqual([
      {
        drive_file_id: "1AbC-d_E",
        title: "Apuntes tema 1",
        url: doc.url,
        mime_type: "application/vnd.google-apps.document",
      },
    ]);
  });

  it("descarta enlaces que no son de Google y ids raros", () => {
    expect(
      prepararDocumentos([
        { ...doc, url: "javascript:alert(1)" },
        { ...doc, url: "https://malo.com/x" },
        { ...doc, id: "../../x" },
      ]),
    ).toEqual([]);
  });

  it("no repite el mismo documento y aguanta datos rotos", () => {
    expect(prepararDocumentos([doc, doc, null, 3])).toHaveLength(1);
    expect(prepararDocumentos("nada")).toEqual([]);
  });

  it("pone un nombre si no tiene", () => {
    expect(prepararDocumentos([{ ...doc, name: "" }])[0].title).toBe(
      "Documento sin nombre",
    );
  });
});

describe("tipoDocumento", () => {
  it("traduce los tipos de Google", () => {
    expect(tipoDocumento("application/vnd.google-apps.spreadsheet")).toBe(
      "Hoja de cálculo",
    );
    expect(tipoDocumento("application/pdf")).toBe("PDF");
    expect(tipoDocumento(null)).toBe("Archivo");
  });
});

describe("direccionDeVuelta", () => {
  it("solo acepta direcciones de la app", () => {
    expect(direccionDeVuelta("/areas/1/proyectos/2")).toBe(
      "/areas/1/proyectos/2",
    );
    expect(direccionDeVuelta("//malo.com")).toBeNull();
    expect(direccionDeVuelta("https://malo.com")).toBeNull();
    expect(direccionDeVuelta("/a?b=c")).toBeNull();
  });
});
