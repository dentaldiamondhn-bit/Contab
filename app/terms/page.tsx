'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Shield, CreditCard, Users, Database, AlertTriangle, Mail } from 'lucide-react';
import Link from 'next/link';

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-cyan-700 text-white py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:bg-cyan-600 mb-4 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" /> Volver
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">Términos y Condiciones</h1>
              <p className="text-cyan-200 mt-1">Última actualización: 28 de agosto de 2026</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-gray-600 leading-relaxed">
              Bienvenido a Diamond Accounting. Al utilizar nuestro servicio de software de contabilidad en la nube 
              ("Servicio"), usted acepta los siguientes términos y condiciones. Por favor, léelos detenidamente 
              antes de utilizar nuestra plataforma.
            </p>
          </CardContent>
        </Card>

        {/* 1. Definiciones */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-cyan-100 text-cyan-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              Definiciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-600">
            <p><strong>"Servicio"</strong> se refiere a la plataforma de contabilidad en la nube Diamond Accounting, incluyendo todas sus funcionalidades, módulos y actualizaciones.</p>
            <p><strong>"Usuario"</strong> o <strong>"Cliente"</strong> se refiere a toda persona física o jurídica que accede y utiliza el Servicio.</p>
            <p><strong>"Tenant"</strong> se refiere a cada organización o empresa que utiliza el Servicio dentro de nuestra arquitectura multi-tenant.</p>
            <p><strong>"Datos del Usuario"</strong> se refiere a toda información, documentos y registros contables que el Usuario ingresa o genera mediante el Servicio.</p>
            <p><strong>"Plan de Suscripción"</strong> se refiere al nivel de servicio contratado que define las funcionalidades, límites y costos del Servicio.</p>
          </CardContent>
        </Card>

        {/* 2. Aceptación de los Términos */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-cyan-100 text-cyan-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              Aceptación de los Términos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-600">
            <p>Al acceder o utilizar el Servicio, usted declara que:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Ha leído y comprendido estos Términos y Condiciones.</li>
              <li>Acepta estar sujeto por estos Términos y Condiciones.</li>
              <li>Tiene autoridad legal para celebrar este acuerdo en nombre propio o de la entidad que representa.</li>
              <li>Cumple con todos los requisitos de elegibilidad aplicables.</li>
            </ul>
            <p>Si no está de acuerdo con alguno de estos términos, no deberá utilizar el Servicio.</p>
          </CardContent>
        </Card>

        {/* 3. Descripción del Servicio */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-cyan-100 text-cyan-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              Descripción del Servicio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-600">
            <p>Diamond Accounting es una plataforma de contabilidad en la nube que ofrece:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Gestión de facturación electrónica y bookkeeping</li>
              <li>Control de inventario y gestión de contactos</li>
              <li>Reportes contables y financieros</li>
              <li>Chat de soporte técnico integrado</li>
              <li>Configuración de impuestos y compliance fiscal</li>
              <li>Otras funcionalidades según el Plan de Suscripción contratado</li>
            </ul>
            <p>Nos reservamos el derecho de modificar, suspende o discontinuar cualquier parte del Servicio en cualquier momento con notificación razonable.</p>
          </CardContent>
        </Card>

        {/* 4. Registro y Cuenta */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-600" />
              <span className="bg-cyan-100 text-cyan-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</span>
              Registro y Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-600">
            <ul className="list-disc pl-6 space-y-2">
              <li>Usted es responsable de mantener la confidencialidad de sus credenciales de acceso.</li>
              <li>Debe proporcionar información precisa y completa durante el registro.</li>
              <li>Es responsable de todas las actividades que ocurran bajo su cuenta.</li>
              <li>Debe notificarnos inmediatamente sobre cualquier uso no autorizado de su cuenta.</li>
              <li>No puede compartir, transferir o vender su cuenta a terceros.</li>
            </ul>
          </CardContent>
        </Card>

        {/* 5. Suscripción y Pagos */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-cyan-600" />
              <span className="bg-cyan-100 text-cyan-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">5</span>
              Suscripción y Pagos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-600">
            <ul className="list-disc pl-6 space-y-2">
              <li>El uso del Servicio requiere una suscripción activa y el pago correspondiente.</li>
              <li>Los precios están expresados en Lempiras (HNL) e incluyen los impuestos aplicables salvo indicación contraria.</li>
              <li>El pago se procesa mensualmente de forma automática.</li>
              <li>Los pagos procesados a través de Stripe, PayPal o Google Pay están sujetos a los términos de dichos proveedores de pago.</li>
              <li>El incumplimiento en el pago resultará en la suspensión del Servicio después de un período de gracia de 7 días.</li>
              <li>Los reembolsos se gestionarán caso por caso dentro de los primeros 30 días de la suscripción.</li>
            </ul>
          </CardContent>
        </Card>

        {/* 6. Propiedad Intelectual */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-cyan-100 text-cyan-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">6</span>
              Propiedad Intelectual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-600">
            <p>Todo el contenido, diseño, código fuente y elementos del Servicio son propiedad exclusiva de Diamond Accounting y están protegidos por las leyes de propiedad intelectual aplicables.</p>
            <p>Usted no puede:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Copiar, modificar o distribuir el Servicio o cualquiera de sus componentes.</li>
              <li>Realizar ingeniería inversa, descompilar o desensamblar el software.</li>
              <li>Utilizar el Servicio para desarrollar un producto o servicio competidor.</li>
              <li>Remover, alterar u ocultar cualquier derecho de autor o marca registrada.</li>
            </ul>
          </CardContent>
        </Card>

        {/* 7. Datos y Privacidad */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-cyan-600" />
              <span className="bg-cyan-100 text-cyan-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">7</span>
              Datos y Privacidad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-600">
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Propiedad de los datos:</strong> Usted mantiene la propiedad completa de todos sus Datos del Usuario.</li>
              <li><strong>Uso de los datos:</strong> Utilizamos sus datos únicamente para proporcionar y mejorar el Servicio.</li>
              <li><strong>Seguridad:</strong> Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos, incluyendo encriptación en tránsito y en reposo.</li>
              <li><strong>Almacenamiento:</strong> Sus datos se almacenan en servidores seguros de Supabase (AWS) ubicados en Estados Unidos.</li>
              <li><strong>Exportación:</strong> Usted puede exportar sus datos en cualquier momento mientras su cuenta esté activa.</li>
              <li><strong>Eliminación:</strong> Al cancelar su suscripción, sus datos serán eliminados de nuestros servidores después de un período de retención de 90 días.</li>
            </ul>
          </CardContent>
        </Card>

        {/* 8. Uso Aceptable */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-600" />
              <span className="bg-cyan-100 text-cyan-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">8</span>
              Uso Aceptable
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-600">
            <p>Usted se compromete a utilizar el Servicio de manera lícita y ética. Está prohibido:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Utilizar el Servicio para actividades ilegales o fraudulentas.</li>
              <li>Violar las leyes fiscales o contables aplicables en su jurisdicción.</li>
              <li>Intentar acceder no autorizado a sistemas o datos de otros usuarios.</li>
              <li>Interferir con el funcionamiento del Servicio o sus servidores.</li>
              <li>Enviar código malicioso, virus o cualquier otro contenido dañino.</li>
              <li>Realizar ingeniería inversa o intentar obtener el código fuente del Servicio.</li>
              <li>Utilizar bots, scrapers o métodos automatizados para acceder al Servicio.</li>
            </ul>
          </CardContent>
        </Card>

        {/* 9. Limitación de Responsabilidad */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-cyan-600" />
              <span className="bg-cyan-100 text-cyan-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">9</span>
              Limitación de Responsabilidad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-600">
            <p>El Servicio se proporciona "tal cual" y "según disponibilidad". No garantizamos que:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>El Servicio será ininterrumpido, seguro o libre de errores.</li>
              <li>Los resultados obtenidos del Servicio serán precisos o confiables.</li>
              <li>El Servicio cumplirá con sus requisitos específicos.</li>
            </ul>
            <p className="mt-4"><strong>En ningún caso Diamond Accounting será responsable por:</strong></p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Pérdidas indirectas, incidentales, especiales o consecuentes.</li>
              <li>Pérdida de beneficios, datos o goodwill.</li>
              <li>Daños resultantes del uso o incapacidad de uso del Servicio.</li>
              <li>Decisiones tomadas basándose en la información del Servicio.</li>
            </ul>
            <p className="mt-4"><strong>Importante:</strong> Diamond Accounting no brinda asesoría legal, fiscal o contable. Usted es responsable de cumplir con todas las regulaciones aplicables a su negocio.</p>
          </CardContent>
        </Card>

        {/* 10. Disponibilidad del Servicio */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-cyan-100 text-cyan-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">10</span>
              Disponibilidad del Servicio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-600">
            <ul className="list-disc pl-6 space-y-2">
              <li>Nos esforzamos por mantener el Servicio disponible 24/7, pero no garantizamos disponibilidad continua.</li>
              <li>Podemos realizar mantenimiento programado con notificación previa de al menos 48 horas.</li>
              <li>No seremos responsables por interrupciones causadas por fuerza mayor, proveedores de servicios de terceros o eventos fuera de nuestro control.</li>
              <li>El tiempo de actividad garantizado es del 99.9% mensual, excluyendo mantenimiento programado.</li>
            </ul>
          </CardContent>
        </Card>

        {/* 11. Cancelación y Terminación */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-cyan-100 text-cyan-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">11</span>
              Cancelación y Terminación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-600">
            <ul className="list-disc pl-6 space-y-2">
              <li>Puede cancelar su suscripción en cualquier momento desde la configuración de su cuenta.</li>
              <li>La cancelación será efectiva al final del período de facturación actual.</li>
              <li>Recibirá acceso al Servicio hasta la fecha de expiración de su suscripción.</li>
              <li>Podemos terminar su acceso inmediatamente si viola estos Términos y Condiciones.</li>
              <li>Tras la terminación, podrá solicitar una exportación de sus datos dentro de los 30 días posteriores.</li>
            </ul>
          </CardContent>
        </Card>

        {/* 12. Modificaciones */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-cyan-100 text-cyan-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">12</span>
              Modificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-600">
            <p>Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier momento. Las modificaciones serán efectivas cuando se publiquen en esta página.</p>
            <p>Le notificaremos sobre cambios significativos por correo electrónico o mediante un aviso en el Servicio con al menos 30 días de anticipación.</p>
            <p>El uso continuado del Servicio después de las modificaciones constituye la aceptación de los nuevos términos.</p>
          </CardContent>
        </Card>

        {/* 13. Ley Aplicable y Jurisdicción */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-cyan-100 text-cyan-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">13</span>
              Ley Aplicable y Jurisdicción
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-600">
            <p>Estos Términos y Condiciones se regirán e interpretarán de conformidad con las leyes de la República de Honduras.</p>
            <p>Cualquier disputa que surja de estos Términos será sometida a la jurisdicción exclusiva de los tribunales de Tegucigalpa, Honduras.</p>
          </CardContent>
        </Card>

        {/* 14. Contacto */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-cyan-600" />
              <span className="bg-cyan-100 text-cyan-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">14</span>
              Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-600">
            <p>Si tiene preguntas sobre estos Términos y Condiciones, puede contactarnos:</p>
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mt-3">
              <p><strong>Diamond Accounting</strong></p>
              <p>Correo electrónico: soporte@diamondaccounting.com</p>
              <p>Teléfono: +504 2234-5678</p>
              <p>Dirección: Blvd. Morazán, Torre de Comercio, Tegucigalpa, Honduras</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-10 pb-10">
          <p>© 2026 Diamond Accounting. Todos los derechos reservados.</p>
          <div className="mt-3 space-x-4">
            <Link href="/terms" className="text-cyan-600 hover:underline">Términos y Condiciones</Link>
            <Link href="/privacy" className="text-cyan-600 hover:underline">Política de Privacidad</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
