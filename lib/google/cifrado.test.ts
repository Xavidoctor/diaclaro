import { describe, expect, it } from "vitest";
import { cifrar, descifrar } from "./cifrado";

describe("cifrar y descifrar el permiso de Google", () => {
  it("con el mismo secreto se recupera el texto", () => {
    const cifrado = cifrar("1//permiso-de-prueba", "secreto");
    expect(cifrado).not.toContain("permiso");
    expect(descifrar(cifrado, "secreto")).toBe("1//permiso-de-prueba");
  });

  it("cada vez sale distinto, aunque el texto sea el mismo", () => {
    expect(cifrar("hola", "secreto")).not.toBe(cifrar("hola", "secreto"));
  });

  it("con otro secreto no se puede descifrar", () => {
    expect(descifrar(cifrar("hola", "secreto"), "otro")).toBeNull();
  });

  it("si alguien toca el texto cifrado, no se acepta", () => {
    const partes = cifrar("hola", "secreto").split(".");
    partes[3] = Buffer.from("adios").toString("base64url");
    expect(descifrar(partes.join("."), "secreto")).toBeNull();
    expect(descifrar("cualquier cosa", "secreto")).toBeNull();
  });
});
