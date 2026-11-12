"use client";

import { Check, ChevronsUpDown, Building2, Users, Settings } from "lucide-react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface CompanySwitcherProps {
  tenants: Array<{
    id: string;
    businessName: string;
    businessRTN?: string;
    industry?: string;
    subscriptionType?: string;
    isActive?: boolean;
  }>;
}

export const CompanySwitcher = ({ tenants }: CompanySwitcherProps) => {
   const [open, setOpen] = useState(false);
   const router = useRouter();
   const { currentTenant, setTenant, isSuperAdmin, isImpersonating } = useTenant();

   const handleTenantSwitch = (tenant: any) => {
     setTenant(tenant);
     setOpen(false);
   };

   const getButtonLabel = () => {
     if (currentTenant) return currentTenant.businessName;
     if (isSuperAdmin && !isImpersonating) return "Seleccionar Empresa (Modo Sistema)";
     return "Seleccionar Empresa";
   };

   const getTenantStatus = (tenant: any) => {
     if (tenant.isActive === false) return { variant: "destructive" as const, text: "Inactivo" };
     if (tenant.subscriptionType === "BASIC") return { variant: "secondary" as const, text: "Basico" };
     if (tenant.subscriptionType === "PROFESSIONAL") return { variant: "default" as const, text: "Profesional" };
     if (tenant.subscriptionType === "ENTERPRISE") return { variant: "default" as const, text: "Empresarial" };
     return { variant: "default" as const, text: "Activo" };
   };

   return (
     <Popover open={open} onOpenChange={setOpen}>
       <PopoverTrigger asChild>
         <Button variant="outline" size="sm" className="w-[280px] justify-between h-10">
           <div className="flex items-center gap-3">
             <Building2 className="h-4 w-4 text-cyan-600" />
             <div className="flex flex-col items-start">
               <span className="truncate font-medium">{getButtonLabel()}</span>
               {currentTenant?.businessRTN && (
                 <span className="text-xs text-muted-foreground">RTN: {currentTenant.businessRTN}</span>
               )}
             </div>
           </div>
           <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
         </Button>
       </PopoverTrigger>
       <PopoverContent className="w-[280px] p-0" align="start">
         <Command>
           <CommandList>
             <CommandGroup heading="Mis Empresas">
               {tenants.map((tenant) => {
                 const status = getTenantStatus(tenant);
                 return (
                   <CommandItem key={tenant.id} value={tenant.id} onSelect={() => handleTenantSwitch(tenant)} className="flex items-center gap-3 px-3 py-2">
                     <div className="flex items-center gap-3 flex-1">
                       <Building2 className="h-4 w-4 text-muted-foreground" />
                       <div className="flex flex-col items-start flex-1">
                         <div className="flex items-center gap-2">
                           <span className="font-medium">{tenant.businessName}</span>
                           <Badge variant={status.variant} className="text-xs">{status.text}</Badge>
                         </div>
                         {tenant.businessRTN && (<span className="text-xs text-muted-foreground">RTN: {tenant.businessRTN}</span>)}
                         {tenant.industry && (<span className="text-xs text-muted-foreground">{tenant.industry}</span>)}
                       </div>
                     </div>
                     {currentTenant?.id === tenant.id && (<Check className="ml-auto h-4 w-4 text-primary" />)}
                   </CommandItem>
                 );
               })}
             </CommandGroup>
<CommandSeparator />
              <CommandGroup heading="Acciones">
                <CommandItem 
                  className="flex items-center gap-3 px-3 py-2"
                  onSelect={() => {
                    setOpen(false);
                    router.push('/admin/tenants/create');
                  }}
                >
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Administrar Nueva Empresa</span>
                </CommandItem>
                <CommandItem 
                  className="flex items-center gap-3 px-3 py-2"
                  onSelect={() => {
                    setOpen(false);
                    router.push('/account/profile');
                  }}
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Configurar Cuenta</span>
                </CommandItem>
              </CommandGroup>
           </CommandList>
         </Command>
       </PopoverContent>
     </Popover>
   );
}
