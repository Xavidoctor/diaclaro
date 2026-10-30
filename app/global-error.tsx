"use client";

// Último recurso: si falla hasta el marco de la app, sale esto. No carga los
// estilos de la app, por eso lleva los suyos aquí mismo.
export default function ErrorGeneral({ retry }: { retry: () => void }) {
  return (
    <html lang="es">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          maxWidth: "36rem",
          margin: "0 auto",
          padding: "2rem 1.5rem",
          lineHeight: 1.5,
        }}
      >
        <title>DíaClaro</title>
        <h1 style={{ fontSize: "1.5rem" }}>Algo no ha ido bien</h1>
        <p>
          DíaClaro no ha podido abrirse. Suele ser algo pasajero: prueba otra
          vez en unos segundos. Lo que ya tenías guardado sigue a salvo.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            minHeight: "44px",
            padding: "0.75rem 1rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "#3a7458",
            color: "white",
            fontSize: "1rem",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
