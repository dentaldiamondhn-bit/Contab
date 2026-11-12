import { render } from '@react-email/render';
import { ModuleUpdateEmail } from './ModuleUpdateEmail';
import React from 'react';

export function renderModuleUpdateEmail(props: any) {
  // @ts-ignore - React Email render types mismatch
  return render(React.createElement(ModuleUpdateEmail, props));
}