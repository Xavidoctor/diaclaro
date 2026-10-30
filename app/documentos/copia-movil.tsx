"use client";

import { useCallback, useEffect, useState } from "react";
import { paseParaCopias } from "@/app/documentos/actions";
import {
  borrarCopia,
  borrarTodasLasCopias,
  guardarCopia,
  guardarDueno,
  leerDueno,
  listarCopias,
} from "@/app/documentos/almacen-movil";
import { planDeCopias, type FichaDocumento } from "@/lib/planner/copias-movil";
import { SaberMas } from "@/app/componentes/saber-mas";

type Ficha = FichaDocumento & { tipoNombre: string };

// Guarda en este móvil una copia de tus documentos importantes, para verlos
// sin internet (por ejemplo, el billete en el aeropuerto). Se pone al día
// solo cada vez que abres esta pantalla con conexión.
export function CopiaMovil({
  documentos,
  usuario,
}: {
  documentos: Ficha[];
  usuario: string;
}) {
  const [estado, setEstado] = useState<
    | { tipo: "revisando" }
    | { tipo: "bajando"; hechos: number; total: number }
    | { tipo: "listo"; guardados: number; fallos: number }
    | { tipo: "apagado" }
    | { tipo: "no-se-puede" }
  >({ tipo: "revisando" });

  const sincronizar = useCallback(async () => {
    if (typeof indexedDB === "undefined") {
      setEstado({ tipo: "no-se-puede" });
      return;
    }
    try {
      // Si en este móvil había copias de otra cuenta, se borran.
      if ((await leerDueno()) !== usuario) {
        await borrarTodasLasCopias();
        await guardarDueno(usuario);
      }
      if (localStorage.getItem("diaclaro-copias") === "no") {
        setEstado({ tipo: "apagado" });
        return;
      }
      const enMovil = await listarCopias();
      const plan = planDeCopias(documentos, enMovil);
      for (const id of plan.borrar) await borrarCopia(id);
      for (const d of plan.actualizar) {
        const copia = enMovil.find((c) => c.id === d.id);
        if (copia) await guardarCopia({ ...copia, ...d });
      }
      let fallos = 0;
      if (plan.bajar.length > 0) {
        const token = await paseParaCopias();
        if (!token) throw new Error("Sin pase de Drive");
        let hechos = 0;
        setEstado({ tipo: "bajando", hechos, total: plan.bajar.length });
        for (const id of plan.bajar) {
          const ficha = documentos.find((d) => d.id === id)!;
          try {
            const respuesta = await fetch(
              `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            if (!respuesta.ok) throw new Error(`Drive: ${respuesta.status}`);
            await guardarCopia({
              ...ficha,
              archivo: await respuesta.blob(),
              guardado: new Date().toISOString(),
            });
          } catch {
            fallos++;
          }
          hechos++;
          setEstado({ tipo: "bajando", hechos, total: plan.bajar.length });
        }
      }
      setEstado({
        tipo: "listo",
        guardados: documentos.length - fallos,
        fallos,
      });
    } catch {
      setEstado({ tipo: "listo", guardados: 0, fallos: documentos.length });
    }
  }, [documentos, usuario]);

  useEffect(() => {
    // Un momento después de pintar la pantalla, para no frenarla.
    const espera = setTimeout(() => void sincronizar(), 0);
    return () => clearTimeout(espera);
  }, [sincronizar]);

  async function apagar() {
    try {
      localStorage.setItem("diaclaro-copias", "no");
      await borrarTodasLasCopias();
    } catch {}
    setEstado({ tipo: "apagado" });
  }

  function encender() {
    try {
      localStorage.removeItem("diaclaro-copias");
    } catch {}
    setEstado({ tipo: "revisando" });
    void sincronizar();
  }

  if (estado.tipo === "no-se-puede") return null;

  return (
    <section className="card flex flex-col gap-2">
      <h2 className="text-lg font-semibold">Sin internet</h2>
      {estado.tipo === "apagado" ? (
        <>
          <p className="text-sm text-muted">
            Este móvil no guarda copia de tus documentos.
          </p>
          <button
            type="button"
            onClick={encender}
            className="button-primary self-start py-2 text-sm"
          >
            Guardar copia en este móvil
          </button>
        </>
      ) : (
        <>
          <p role="status" className="text-sm text-muted">
            {estado.tipo === "revisando" && "Revisando la copia de este móvil…"}
            {estado.tipo === "bajando" &&
              `Guardando copia en este móvil: ${estado.hechos} de ${estado.total}…`}
            {estado.tipo === "listo" &&
              (estado.fallos > 0
                ? `Copia en este móvil: ${estado.guardados} de ${documentos.length}. Algunos no se han podido guardar; se reintentará la próxima vez.`
                : documentos.length === 0
                  ? "Cuando guardes documentos, también tendrás una copia en este móvil."
                  : `Copia en este móvil: ${documentos.length} de ${documentos.length}.`)}
          </p>
          <SaberMas resumen="Funciona sin conexión.">
            Sin conexión, abre DíaClaro y te salen tus documentos. La copia solo
            está en este móvil: si borras los datos de Chrome, se pierde, pero
            en Drive siguen a salvo.
          </SaberMas>
          <button
            type="button"
            onClick={apagar}
            className="self-start text-sm underline"
          >
            Borrar la copia de este móvil
          </button>
        </>
      )}
    </section>
  );
}
