// La guía de uso de DíaClaro: qué hace cada pantalla y cómo se usa.
// Solo textos y una función pura, con pruebas en guia.test.ts.
// Si cambias una pantalla, cambia aquí también su explicación.

export type SeccionGuia = {
  id: string; // se usa en la dirección: /guia#bandeja
  titulo: string;
  resumen: string; // una frase: para qué sirve
  pasos: string[]; // cómo se usa, paso a paso
  enlace?: { href: string; texto: string }; // para ir a esa pantalla
};

export const SECCIONES_GUIA: SeccionGuia[] = [
  {
    id: "empezar",
    titulo: "Por dónde empezar",
    resumen: "Tres cosas que conviene hacer el primer día.",
    pasos: [
      "En Ajustes, pon tu hora habitual de levantarte y de acostarte. La app las usa para saber cuánto tiempo te queda cada día.",
      "En Áreas, crea las grandes partes de tu vida (estudios, empleo, casa…) y, si quieres, las horas que les quieres dar cada semana.",
      "A partir de ahí, apunta todo lo que te venga a la cabeza en el cuadro «Apunta algo» de Hoy. Ya lo ordenarás después.",
    ],
  },
  {
    id: "hoy",
    titulo: "Hoy",
    resumen: "La pantalla principal: lo que te toca hoy, todo junto.",
    pasos: [
      "Arriba están los botones «Despierto» y «Levantado». Pulsa «Levantado» al salir de la cama y la app calcula tu día desde esa hora.",
      "«Tu plan de hoy» te enseña la siguiente tarea y tus 3 prioridades. El orden sale de la fecha y la importancia que pones en cada tarea.",
      "Si lo que tienes no cabe en el tiempo que te queda, sale un aviso con ideas para recortar. No cambia nada hasta que pulsas «Aceptar».",
      "Más abajo tienes la agenda del día, tus rutinas (pulsa «Hecho» cuando las hagas), tus hábitos y el cierre del día.",
    ],
    enlace: { href: "/", texto: "Ir a Hoy" },
  },
  {
    id: "apuntar",
    titulo: "Apuntar algo rápido",
    resumen: "Para sacar una idea de la cabeza en segundos.",
    pasos: [
      "Escribe en el cuadro «Apunta algo» de Hoy y pulsa Enter. Se guarda en la Bandeja.",
      "Escribe #algo (por ejemplo #ade) para ponerle una etiqueta.",
      "Si no tienes conexión, se guarda en el móvil y se envía sola cuando vuelve la red.",
    ],
    enlace: { href: "/", texto: "Ir a Hoy" },
  },
  {
    id: "bandeja",
    titulo: "Bandeja",
    resumen: "Todo lo que apuntas, separado en Notas y Tareas.",
    pasos: [
      "En la pestaña Notas puedes buscar, filtrar por etiqueta, fijar arriba lo importante y archivar lo que ya no necesitas.",
      "En la pestaña Tareas toca una tarea para ponerle fecha, importancia, minutos y proyecto. Cuanto más completes, mejor te ordena el plan.",
      "Si tienes la cabeza llena, pulsa «¿Mucho en la cabeza? Ordénalo con IA»: escribes todo de golpe y te propone tareas, citas y notas. Tú eliges qué se guarda.",
    ],
    enlace: { href: "/bandeja", texto: "Ir a la Bandeja" },
  },
  {
    id: "agenda",
    titulo: "Agenda",
    resumen: "Tus citas de los próximos días y un calendario del mes.",
    pasos: [
      "Pulsa «Añadir» para apuntar una cita. Puede ser de una vez o repetirse cada día o algunos días de la semana.",
      "Debajo tienes el calendario del mes: toca un día para ver lo que tienes. Un puntito marca los días con algo apuntado.",
      "Toca una cita para cambiarla, o para cambiar solo un día concreto si se repite.",
      "Si algo se mueve (una cita cancelada, una entrega que cambia), pulsa «¿Algo ha cambiado?» y cuéntalo con tus palabras.",
      "Si conectas Google Calendar en Ajustes, sus eventos también salen aquí. DíaClaro solo los lee, nunca los cambia.",
    ],
    enlace: { href: "/agenda", texto: "Ir a la Agenda" },
  },
  {
    id: "areas",
    titulo: "Áreas y proyectos",
    resumen: "Las grandes partes de tu vida, con sus proyectos y sus horas.",
    pasos: [
      "Cada área (por ejemplo, estudios) tiene proyectos dentro. Una asignatura también es un proyecto.",
      "Puedes ponerle a cada área las horas que quieres darle a la semana. Si es un hobby, márcala como «Es tiempo personal» y nunca pasará delante de lo demás.",
      "En «Tu semana» ves el tiempo que has dado a cada área frente al que te propusiste.",
    ],
    enlace: { href: "/areas", texto: "Ir a Áreas" },
  },
  {
    id: "foco",
    titulo: "Foco",
    resumen: "Un temporizador para concentrarte en una cosa.",
    pasos: [
      "Desde Hoy, pulsa «Foco», elige una tarea (o ninguna) y los minutos.",
      "Puedes pausarlo o terminar antes. Al acabar, apunta cuánto has tardado de verdad: así la app aprende tus tiempos reales.",
    ],
    enlace: { href: "/foco", texto: "Ir a Foco" },
  },
  {
    id: "dia-dificil",
    titulo: "Día difícil",
    resumen: "Para los días en que no puedes con todo.",
    pasos: [
      "En «Tu plan de hoy», pulsa «Día difícil» y elige qué ha pasado.",
      "La app te propone qué conservar, qué reducir y qué aplazar. Nada cambia hasta que pulsas «Aceptar».",
    ],
    enlace: { href: "/dia-dificil", texto: "Abrir Día difícil" },
  },
  {
    id: "cierre",
    titulo: "Cierre del día",
    resumen: "Dos minutos al final del día para mirar atrás.",
    pasos: [
      "Al final de Hoy, pulsa «Cierre del día» y apunta qué has conseguido y qué cambiarías mañana.",
      "Al día siguiente, Hoy te recuerda lo que dijiste que cambiarías.",
    ],
    enlace: { href: "/cierre", texto: "Ir al cierre" },
  },
  {
    id: "empleo",
    titulo: "Candidaturas de empleo",
    resumen: "A qué ofertas te has presentado y cuándo volver a mirarlas.",
    pasos: [
      "Apunta cada oferta con la empresa y el puesto.",
      "Si pones un día de seguimiento, ese día te sale en Hoy para que no se te olvide.",
    ],
    enlace: { href: "/empleo", texto: "Ir a Candidaturas" },
  },
  {
    id: "habitos",
    titulo: "Hábitos",
    resumen: "Para observar lo que quieras, sin juicios.",
    pasos: [
      "En Ajustes, abre Hábitos y añade lo que quieras seguir (agua, lectura, ejercicio…).",
      "Cada día lo apuntas desde Hoy y ves un resumen de la semana. No hay rachas que se rompan.",
      "Si le pones una hora de recordatorio, a partir de esa hora te lo recuerda en Hoy si aún no has apuntado nada.",
    ],
    enlace: { href: "/habitos", texto: "Ir a Hábitos" },
  },
  {
    id: "documentos",
    titulo: "Documentos importantes",
    resumen: "DNI, billetes, entradas… a mano sin buscar en la galería.",
    pasos: [
      "En Ajustes, abre Documentos. Se guardan en una carpeta de tu Google Drive.",
      "Búscalos por nombre o por tipo cuando los necesites.",
    ],
    enlace: { href: "/documentos", texto: "Ir a Documentos" },
  },
  {
    id: "ajustes",
    titulo: "Ajustes",
    resumen: "Tus horas, tus rutinas, Google y la copia de seguridad.",
    pasos: [
      "Cambia tus horas de levantarte, comer, cenar y acostarte, y tu zona horaria.",
      "Añade rutinas: cosas que haces a menudo sin hora fija, como pasear al perro.",
      "Descarga una copia de seguridad de tus datos una vez a la semana.",
      "En «Guía de uso» puedes repetir el recorrido de bienvenida, abrir esta guía y volver a mostrar la ayuda pequeña de cada pantalla.",
    ],
    enlace: { href: "/ajustes", texto: "Ir a Ajustes" },
  },
];

// Qué parte de la guía explica cada pantalla. La ruta es la dirección,
// por ejemplo "/bandeja" o "/areas/123". Si no hay explicación, da null.
export function seccionDeRuta(ruta: string): SeccionGuia | null {
  const primera = ruta.split("?")[0].split("/")[1] ?? "";
  const id = primera === "" ? "hoy" : primera;
  return SECCIONES_GUIA.find((s) => s.id === id) ?? null;
}
