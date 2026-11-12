declare module '@react-email/components';

import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';
import * as React from 'react';

interface ModuleUpdateEmailProps {
  businessName: string;
  activeModuleIds: string[];
  dashboardUrl: string;
  planId: string;
}

const MODULE_NAMES: Record<string, string> = {
  'ACCOUNTING': 'Contabilidad Central',
  'BILLING': 'Facturación y Ventas',
  'INVENTORY': 'Inventario',
  'CONTACTS': 'Contactos',
  'REPORTS': 'Reportes y Análisis'
};

const PLAN_COLORS: Record<string, string> = {
  'BASIC': '#2563eb',
  'PREMIUM': '#d4af37',
  'PRO': '#7c3aed',
};

export const ModuleUpdateEmail = ({
  businessName = 'Empresa',
  activeModuleIds = [],
  dashboardUrl = 'https://contab.com/dashboard',
  planId = 'BASIC'
}: ModuleUpdateEmailProps) => {
  const buttonColor = PLAN_COLORS[planId] || PLAN_COLORS.BASIC;

  return (
    <Html>
      <Head />
      <Preview>Actualización de módulos en Contab</Preview>
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-10 mx-auto p-5 w-[465px]">
            <Text className="text-black text-2xl font-normal text-center p-0 my-8 mx-0">
              ¡Hola, <strong>{businessName}</strong>!
            </Text>
            <Text className="text-black text-sm leading-6">
              Se ha actualizado la configuración de tus módulos en <strong>Diamond Accounting</strong>.
            </Text>

            <Section className="bg-gray-50 border border-gray-200 rounded-md p-4 my-6">
              <Text className="text-black text-base font-semibold m-0">
                Módulos habilitados:
              </Text>
              <ul className="list-disc pl-5 text-sm leading-6 text-gray-700">
                {activeModuleIds.map((id) => (
                  <li key={id}>{MODULE_NAMES[id] || id}</li>
                ))}
              </ul>
            </Section>

            <Section className="text-center my-8">
              <Button
                style={{ backgroundColor: buttonColor }}
                className="rounded text-white text-sm font-semibold no-underline text-center px-5 py-3"
                href={dashboardUrl}
              >
                Ver detalles en mi Dashboard
              </Button>
            </Section>
            <Text className="text-black text-sm leading-6">
              Saludos,<br />El equipo de Contab
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ModuleUpdateEmail;
