3. Puntos Críticos para el Éxito de la Integración (Dependencias Externas)
Desde el lado de Booking Prototipo, la plataforma está completamente terminada, blindada y lista. No obstante, para garantizar el 100% de la calificación en el Criterio Excluyente (CE01) y evitar fricciones con los compañeros de clase, debemos considerar:

Protocolo gRPC de las Tiendas Externas: Los compañeros de las tiendas individuales deben apuntar sus clientes gRPC a nuestra IP/Host en el puerto 50051 utilizando la definición exacta de 

src/proto/inventory.proto
.
Contratos REST v2: Al momento de la compra o cancelación, nuestro Booking emitirá peticiones POST hacia los endpoints REST públicos de sus tiendas con las cabeceras Idempotency-Key y X-Correlation-Id. Sus APIs deben soportar o ignorar de forma idempotente estas cabeceras.
Despliegue y URLs Públicas: El Criterio CE10 exige que todos los sistemas estén desplegados con HTTPS en Internet. Una vez que realices tu commit y push manual a origin/main, Render (Backend) y Vercel (Frontend) actualizarán la versión en la nube.