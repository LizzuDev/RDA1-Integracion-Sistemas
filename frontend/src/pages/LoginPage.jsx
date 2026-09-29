/**
 * Pagina de Login (destino del logout forzado por 401).
 *
 * ── Alcance deliberadamente minimo ──────────────────────────────────────────
 * La autenticacion PERTENECE A OTRO DOMINIO: `vuelos-openapi.yaml` no define
 * ningun endpoint de login, refresh ni logout, y declara que la logica de
 * autenticacion y 3DS vive fuera de esta API. Por eso esta pagina NO implementa
 * autenticacion: es el marcador de posicion donde el IdP deberia insertar su
 * UI (OIDC / OAuth2 authorization code), y mientras tanto evita que el logout
 * forzado del interceptor de Axios aterrice en un 404.
 *
 * No se aceptan ni se envian credenciales aqui. Un formulario de usuario y
 * contrasena sin un endpoint real solo generaria la sensacion de que se ha
 * iniciado sesion cuando no es cierto.
 */
import { useNavigate } from 'react-router-dom';
import { estaAutenticado, limpiarSesion } from '../services/api';

export function LoginPage() {
  const navigate = useNavigate();

  // Si ya hay un token en memoria, no tiene sentido quedarse en el login.
  if (estaAutenticado()) {
    navigate('/', { replace: true });
  }

  return (
    <main className="main-content" id="contenido-principal">
      <div className="state-container">
        <div className="error-icon" aria-hidden="true">
          🔐
        </div>
        <h1 className="state-title">Sesion iniciada</h1>
        <p className="state-subtitle">
          Tu sesion expiro o no es valida. Vuelve a iniciar sesion para
          continuar con tus reservas.
        </p>

        <div className="login-acciones">
          {/*
            El punto de integracion con el IdP real. Cuando exista, este boton
            iniciara el flujo OAuth2 authorization code contra
            https://auth.booking-hub.com/oauth2/authorize.
          */}
          <button
            className="retry-btn"
            type="button"
            onClick={() => navigate('/', { replace: true })}
          >
            Iniciar sesion
          </button>

          <button
            className="login-secundario"
            type="button"
            onClick={() => {
              limpiarSesion();
              navigate('/', { replace: true });
            }}
          >
            Continuar sin sesion
          </button>
        </div>

        <p className="login-nota">
          La autenticacion es responsabilidad de otro dominio. Esta pantalla es
          un marcador de posicion a la espera de integrar el proveedor de
          identidad.
        </p>
      </div>
    </main>
  );
}
