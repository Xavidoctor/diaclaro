// Junta lo que acabas de dictar con lo que ya había escrito en el cuadro.
// Funciones puras, con pruebas en dictado.test.ts.

// Añade el texto dictado al final, con un espacio en medio si hace falta.
// Si el cuadro estaba vacío, la primera letra va en mayúscula.
export function juntarDictado(previo: string, dictado: string): string {
  const nuevo = dictado.trim().replace(/\s+/g, " ");
  if (!nuevo) return previo;
  if (!previo.trim())
    return nuevo.charAt(0).toLocaleUpperCase("es-ES") + nuevo.slice(1);
  const separador = /\s$/.test(previo) ? "" : " ";
  return previo + separador + nuevo;
}

// Mensaje claro para cada error del dictado del navegador.
// Los códigos son los de la Web Speech API.
export function mensajeErrorDictado(codigo: string): string | null {
  switch (codigo) {
    case "no-speech":
    case "aborted":
      return null; // no has dicho nada o lo has parado tú: no es un error
    case "not-allowed":
    case "service-not-allowed":
      return "El navegador no deja usar el micrófono. Dale permiso en los ajustes de la página.";
    case "audio-capture":
      return "No encuentro el micrófono.";
    case "network":
      return "Para dictar hace falta conexión a internet.";
    default:
      return "No he podido oírte. Prueba otra vez o escríbelo.";
  }
}
