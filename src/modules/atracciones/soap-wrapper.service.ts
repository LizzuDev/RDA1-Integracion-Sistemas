import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SoapWrapperService {
  private readonly logger = new Logger(SoapWrapperService.name);

  /**
   * Traduce un objeto JSON REST a un Envelope SOAP (XML).
   * Cumple con la restricción "Utilizar el patrón de Wrapper para que el API Gateway traduzca de Rest/Json a SOAP/CML".
   */
  async translateToSoap(restPayload: any, soapAction: string): Promise<string> {
    const payloadStr = JSON.stringify(restPayload).replace(/"/g, '&quot;');
    
    // Generación manual del XML para evitar dependencias externas como xml2js en este prototipo
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
   <soapenv:Header/>
   <soapenv:Body>
      <tem:${soapAction}>
         <requestData>${payloadStr}</requestData>
      </tem:${soapAction}>
   </soapenv:Body>
</soapenv:Envelope>`;
    
    this.logger.debug(`[Wrapper REST->SOAP] Payload JSON traducido a XML:\n${xml}`);
    return xml;
  }

  /**
   * Finge el envío de un sobre SOAP a un sistema legado CML/SOAP y parsea su respuesta a JSON.
   */
  async sendSimulatedSoapRequest(xmlPayload: string): Promise<any> {
    this.logger.log(`Enviando petición SOAP al sistema legado (Simulado)...`);
    
    // Simula un retraso de red
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Simula una respuesta XML del sistema legado
    const simulatedResponseXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
   <soapenv:Body>
      <tem:Response xmlns:tem="http://tempuri.org/">
         <status>SUCCESS</status>
         <message>Operación procesada exitosamente en el sistema legado CML</message>
         <timestamp>${new Date().toISOString()}</timestamp>
      </tem:Response>
   </soapenv:Body>
</soapenv:Envelope>`;

    this.logger.debug(`[Wrapper SOAP->REST] Respuesta recibida del sistema legado en XML:\n${simulatedResponseXml}`);

    // Parseo simulado de XML a JSON (usando regex básico para extraer datos por simplicidad sin librerías externas)
    const statusMatch = simulatedResponseXml.match(/<status>(.*?)<\/status>/);
    const messageMatch = simulatedResponseXml.match(/<message>(.*?)<\/message>/);
    
    const parsedJson = {
      status: statusMatch ? statusMatch[1] : 'UNKNOWN',
      message: messageMatch ? messageMatch[1] : '',
    };
    
    this.logger.log(`[Wrapper SOAP->REST] Traducción de XML SOAP a JSON REST completada.`);
    return parsedJson;
  }
}
