// La copia de tus documentos importantes dentro del navegador del móvil
// (IndexedDB). Así se pueden ver sin internet. Solo funciona en el navegador.
// public/sin-conexion.html lee esta misma base de datos: si cambias los
// nombres de aquí, cámbialos también allí.

export const BASE = "diaclaro-documentos";
const ALMACEN = "documentos";
const AJUSTES = "ajustes";

export type CopiaEnMovil = {
  id: string;
  nombre: string;
  tipo: string;
  tipoNombre: string;
  mime: string;
  archivo: Blob;
  guardado: string;
};

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolver, fallar) => {
    const peticion = indexedDB.open(BASE, 1);
    peticion.onupgradeneeded = () => {
      peticion.result.createObjectStore(ALMACEN, { keyPath: "id" });
      peticion.result.createObjectStore(AJUSTES);
    };
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => fallar(peticion.error);
  });
}

async function usar<T>(
  almacen: string,
  modo: IDBTransactionMode,
  accion: (a: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const base = await abrir();
  try {
    return await new Promise((resolver, fallar) => {
      const transaccion = base.transaction(almacen, modo);
      const peticion = accion(transaccion.objectStore(almacen));
      transaccion.oncomplete = () => resolver(peticion?.result);
      transaccion.onerror = () => fallar(transaccion.error);
      transaccion.onabort = () => fallar(transaccion.error);
    });
  } finally {
    base.close();
  }
}

export async function listarCopias(): Promise<CopiaEnMovil[]> {
  return ((await usar(ALMACEN, "readonly", (a) => a.getAll())) ??
    []) as CopiaEnMovil[];
}

export async function guardarCopia(copia: CopiaEnMovil) {
  await usar(ALMACEN, "readwrite", (a) => a.put(copia));
}

export async function borrarCopia(id: string) {
  await usar(ALMACEN, "readwrite", (a) => a.delete(id));
}

export async function borrarTodasLasCopias() {
  await usar(ALMACEN, "readwrite", (a) => a.clear());
}

// De quién son las copias: si en este móvil entra otra persona, se borran.
export async function leerDueno(): Promise<string | undefined> {
  return (await usar(AJUSTES, "readonly", (a) => a.get("dueno"))) as
    | string
    | undefined;
}

export async function guardarDueno(usuario: string) {
  await usar(AJUSTES, "readwrite", (a) => a.put(usuario, "dueno"));
}
