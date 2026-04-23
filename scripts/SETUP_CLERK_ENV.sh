#!/bin/bash

# Script para configurar variables de Clerk en Vercel
# Ejecuta estos comandos uno por uno con tus claves de Clerk

echo "Configurando variables de Clerk para Vercel..."
echo "Ve al dashboard de Clerk -> API Keys para obtener estos valores"
echo ""

echo "1. Agregando CLERK_PUBLISHABLE_KEY..."
echo "Ejecuta: vercel env add CLERK_PUBLISHABLE_KEY"
echo "Valor: pk_test_... (o pk_live_... para producción)"
echo ""

echo "2. Agregando CLERK_SECRET_KEY..."
echo "Ejecuta: vercel env add CLERK_SECRET_KEY"
echo "Valor: sk_test_... (o sk_live_... para producción)"
echo ""

echo "3. Agregando NEXT_PUBLIC_CLERK_SIGN_IN_URL..."
echo "Ejecuta: vercel env add NEXT_PUBLIC_CLERK_SIGN_IN_URL"
echo "Valor: /auth/login"
echo ""

echo "4. Agregando NEXT_PUBLIC_CLERK_SIGN_UP_URL..."
echo "Ejecuta: vercel env add NEXT_PUBLIC_CLERK_SIGN_UP_URL"
echo "Valor: /auth/sign-up"
echo ""

echo "5. Agregando NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL..."
echo "Ejecuta: vercel env add NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL"
echo "Valor: /dashboard"
echo ""

echo "6. Agregando NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL..."
echo "Ejecuta: vercel env add NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL"
echo "Valor: /dashboard"
echo ""

echo "7. Agregando NEXT_PUBLIC_CLERK_SIGN_OUT_URL..."
echo "Ejecuta: vercel env add NEXT_PUBLIC_CLERK_SIGN_OUT_URL"
echo "Valor: /auth/login"
echo ""

echo "Después de configurar todas las variables, ejecuta:"
echo "vercel --prod"
echo ""

echo "Para verificar las variables configuradas:"
echo "vercel env ls"
