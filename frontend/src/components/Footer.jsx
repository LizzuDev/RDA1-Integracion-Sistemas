import { Link } from 'react-router-dom';

/**
 * Pie de pagina.
 *
 * Incluye los enlaces legales exigidos por la seccion 5 del
 * FRONTEND_IMPLEMENTATION_PLAN.md: Terminos de Uso, Politica de Privacidad y
 * el acceso a las preferencias de cookies.
 *
 * El enlace de cookies es un boton porque dispara una ACCION (abrir el panel de
 * preferencias) y no navega a otra ruta; un <a> sin href no es enfocable con
 * teclado ni lo anuncian los lectores de pantalla.
 */
import { useLanguage } from '../hooks/LanguageContext';

export function Footer({ onAbrirPreferenciasCookies }) {
  const { t } = useLanguage();
  const anio = new Date().getFullYear();

  return (
    <footer className="footer">
      <nav className="footer-links" aria-label="Enlaces legales">
        <Link to="/privacidad">{t('footer.privacy')}</Link>
        <span aria-hidden="true">·</span>
        <Link to="/terminos">{t('footer.terms')}</Link>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          className="footer-link-btn"
          onClick={onAbrirPreferenciasCookies}
        >
          {t('footer.cookies')}
        </button>
      </nav>

      <p>
        © {anio} <strong>Booking Prototipo</strong> — Proyecto Integrador de
        Sistemas · Universidad
      </p>
      <p style={{ marginTop: 8, fontSize: '.78rem' }}>
        Powered by NestJS · React · PostgreSQL · Docker
      </p>
    </footer>
  );
}
