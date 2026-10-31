// Secciones que no todo el mundo usa: Empleo (candidaturas) y Documentos
// importantes. Nada se borra: solo se esconden para que la app se vea más limpia.
//
// Cada sección tiene una preferencia guardada en Ajustes:
// - true: siempre se ve.
// - false: no se ve (la pantalla sigue existiendo).
// - null: automático. Se ve solo si ya la estás usando
//   (tienes alguna candidatura, o has conectado tu Drive).
// Así, a una persona nueva no le salen, y a quien ya las usa no le desaparecen.

export type Preferencia = boolean | null;

export type PreferenciasSecciones = {
  empleo: Preferencia;
  documentos: Preferencia;
};

export type Secciones = { empleo: boolean; documentos: boolean };

// Lo que hay si aún no has tocado nada (o la columna aún no existe).
export const PREFERENCIAS_INICIALES: PreferenciasSecciones = {
  empleo: null,
  documentos: null,
};

// ¿Se ve la sección? Con «automático», depende de si ya la usas.
export function seccionVisible(
  preferencia: Preferencia,
  laUsas: boolean,
): boolean {
  return preferencia ?? laUsas;
}

export function seccionesVisibles(
  preferencias: PreferenciasSecciones,
  uso: { candidaturas: boolean; drive: boolean },
): Secciones {
  return {
    empleo: seccionVisible(preferencias.empleo, uso.candidaturas),
    documentos: seccionVisible(preferencias.documentos, uso.drive),
  };
}

// La casilla del formulario: marcada = "on" (se ve); sin marcar no llega nada.
export function leerCasilla(valor: FormDataEntryValue | null): boolean {
  return valor === "on";
}
