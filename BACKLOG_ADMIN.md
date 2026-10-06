# Backlog: Funcionalidades Faltantes (Panel de Administración)

Este documento detalla la lógica de negocio y desarrollo backend necesario para que el panel de administración sea 100% funcional y dinámico, separando las responsabilidades correctamente.

## 1. Autenticación y Sistema de Roles (RBAC) 🔐
*Objetivo: Separar quién ve qué en la plataforma.*
- **Base de Datos:** Modificar la tabla de usuarios para incluir un campo `role` (Ej: `ADMIN`, `PROVIDER`, `CLIENT`).
- **Frontend (Rutas Protegidas):** 
  - Si un usuario con rol `PROVIDER` inicia sesión, **solo** debe ser redirigido a una vista específica (la Extranet, que fue extraída del panel principal).
  - Si es `ADMIN`, ve todo el panel central (este AdminDashboard).

## 2. Flujo de Afiliación de Proveedores (Onboarding) 🤝
*Objetivo: Permitir que nuevos hoteles o rentadoras se unan.*
- **Frontend:** Crear una página de registro especial tipo `tudominio.com/asociate`.
- **Backend:** Cuando un proveedor se registra, la cuenta nace con estado `PENDING_APPROVAL`.
- **Integración Admin:** Conectar esto con la pestaña "Soporte (QC)" del Admin, para que el administrador central apruebe la solicitud antes de que el proveedor pueda operar.

## 3. Lógica Real de la Extranet (Channel Manager & Tarifas) 🏨
*Objetivo: Separar la Extranet en su propio portal (fuera de este AdminDashboard) y darle vida.*
- **Base de Datos:** Crear tablas para manejar el **Inventario por día** (disponibilidad por fecha) y tablas para **Reglas de Tarifas** (Yield Management).
- **Backend (Reservas):** Endpoint para que cuando un cliente reserve, automáticamente se reste `-1` a la disponibilidad en ese calendario, evitando sobreventa (Overbooking).

## 4. Motor Financiero y Liquidaciones (Payouts) 💰
*Objetivo: Calcular ganancias y pagar a proveedores.*
- **Backend:** Lógica que, por cada reserva exitosa, calcule: *Total pagado por el cliente - 15% de comisión de la plataforma = Saldo a pagar al proveedor.*
- **Base de Datos:** Almacenar esos saldos en una tabla `Liquidaciones`.
- **Integración Admin:** Cuando el Super Admin presione "Aprobar Payout" en la pestaña Finanzas, el estado debe cambiar a "Pagado" (Idealmente integrando Stripe Connect para automatizar la transferencia).

## 5. Reglas de Marketing y Lealtad (Clon Genius) 🎁
*Objetivo: Motores de promociones para clientes.*
- **Backend (Checkout):** Endpoint que valide códigos de descuento dinámicos (Ej: `BLACKEC26`) creados en el admin.
- **Backend (Usuarios):** Motor lógico que revise el historial de reservas de un usuario. Si tiene >5 reservas, actualizar su nivel a `Genius Nivel 2` en BD, para que al iniciar sesión sus precios incluyan descuento automático.

## 6. Integración Real de Proveedores Externos (RDA2) 🔗
*Objetivo: Conectar con las APIs de los otros grupos.*
- **Backend (Cron / Salud):** Crear un script o endpoint que haga `ping` a las APIs reales de los otros grupos de la universidad para la pestaña de Microservicios.
- **Frontend:** Reemplazar los datos "random" o simulados por la respuesta y latencia real (en ms) de esos sistemas externos.
