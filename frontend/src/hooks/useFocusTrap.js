import { useEffect, useRef } from 'react';

/**
 * Atrapador de foco (Focus Trap) para modales y dialogos.
 *
 * Requisito de la seccion 4 del FRONTEND_IMPLEMENTATION_PLAN.md y de la regla 3
 * del OPENCLOUD_FRONTEND_CONTEXT.md: un dialogo debe CONFENIR el foco, de modo
 * que un usuario de teclado o de lector de pantalla no pueda tabular fuera de
 * el mientras esta abierto.
 *
 * ## Comportamiento
 * · Al abrirse, el foco entra al primer elemento enfocable del contenedor.
 * · Tab / Shift+Tab ciclan entre los elementos enfocables, sin salir.
 * · `Escape` invoca `onClose`.
 * · Al cerrarse, el foco vuelve al elemento que lo tenia antes de abrirse.
 *
 * ## Por que se devuelve el foco
 * Sin restaurarlo, el usuario que abrio el dialogo con el teclado se queda
 * con el foco en <body>: la siguiente pulsacion de Tab pierde el sentido y
 * resulta desorientador. Es un fallo de usabilidad muy comun.
 *
 * @param {boolean} activo        true cuando el dialogo esta abierto
 * @param {() => void} onClose    se invoca con Escape
 * @param {React.RefObject} ref    ref del contenedor del dialogo
 */
export function useFocusTrap(activo, onClose, ref) {
  // Guarda el elemento que tenia el foco ANTES de abrir el dialogo.
  const elementoPrevio = useRef(null);

  useEffect(() => {
    if (!activo) return undefined;

    elementoPrevio.current = document.activeElement;

    // El primer elemento enfocable puede estar en un boton, un enlace, un
    // input, un select, un textarea o cualquier elemento con tabindex >= 0.
    const FOCALIZABLES =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const contenedor = ref.current;
    if (contenedor) {
      const primero = contenedor.querySelector(FOCALIZABLES);
      (primero || contenedor).focus();
    }

    const alPresionarTecla = (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        onClose?.();
        return;
      }

      if (evento.key !== 'Tab') return;

      const nodos = contenedor?.querySelectorAll(FOCALIZABLES);
      if (!nodos || nodos.length === 0) {
        evento.preventDefault();
        return;
      }

      const primero = nodos[0];
      const ultimo = nodos[nodos.length - 1];

      // Tab desde el ultimo -> primero (Shift+Tab -> ultimo): se cierra el ciclo.
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', alPresionarTecla);

    return () => {
      document.removeEventListener('keydown', alPresionarTecla);
      // Devuelve el foco a donde estaba.
      elementoPrevio.current?.focus?.();
    };
  }, [activo, onClose, ref]);
}
