// Qué hay que hacer con la copia de tus documentos importantes en el móvil
// para que coincida con tu Drive. Función pura, con pruebas en
// copias-movil.test.ts. La copia sirve para verlos sin internet.

export type FichaDocumento = {
  id: string;
  nombre: string;
  tipo: string;
  mime: string;
};

export type PlanCopias = {
  bajar: string[]; // en Drive y aún no en el móvil
  actualizar: FichaDocumento[]; // ya en el móvil, pero con otro nombre o tipo
  borrar: string[]; // en el móvil, pero ya no en Drive
};

export function planDeCopias(
  enDrive: FichaDocumento[],
  enMovil: FichaDocumento[],
): PlanCopias {
  const movil = new Map(enMovil.map((d) => [d.id, d]));
  const drive = new Set(enDrive.map((d) => d.id));
  const plan: PlanCopias = { bajar: [], actualizar: [], borrar: [] };
  for (const d of enDrive) {
    const copia = movil.get(d.id);
    if (!copia) plan.bajar.push(d.id);
    else if (copia.nombre !== d.nombre || copia.tipo !== d.tipo)
      plan.actualizar.push(d);
  }
  for (const d of enMovil) if (!drive.has(d.id)) plan.borrar.push(d.id);
  return plan;
}
