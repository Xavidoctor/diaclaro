// Devuelve el saludo según la hora del día (0-23).
export function saludo(hora: number): string {
  if (hora >= 6 && hora < 14) return "Buenos días";
  if (hora >= 14 && hora < 21) return "Buenas tardes";
  return "Buenas noches";
}
