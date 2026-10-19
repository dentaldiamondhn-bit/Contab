'use client';

import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCodeLib from 'qrcode';

interface BarcodeDisplayProps {
  /** Valor codificado. Si esta vacio no se dibuja nada. */
  value: string;
  /** 'lineal' = barras CODE128; 'qr' = codigo cuadrado. */
  type?: 'linear' | 'qr';
  /** Alto de las barras en px (solo lineal). */
  height?: number;
  /** Ancho de un modulo en px (solo lineal). */
  moduleWidth?: number;
  /** Lado de la imagen QR en px. */
  qrSize?: number;
  className?: string;
}

/**
 * Dibuja un codigo de barras desde un valor, sin subir nada:
 * - lineal: JsBarcode sobre un <svg> (CODE128, acepta cualquier texto).
 * - qr: QRCode.toDataURL en el cliente, igual que PaymentLinkGenerator.
 *
 * Ambos son best-effort: si el valor no es codificable se queda vacio en vez
 * de lanzar y romper la pantalla.
 */
export default function BarcodeDisplay({
  value,
  type = 'linear',
  height = 64,
  moduleWidth = 2,
  qrSize = 160,
  className,
}: BarcodeDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [qrUrl, setQrUrl] = useState('');

  const valor = (value || '').trim();

  useEffect(() => {
    if (type !== 'linear' || !svgRef.current) return;
    const svg = svgRef.current;
    if (!valor) {
      svg.innerHTML = '';
      return;
    }
    try {
      JsBarcode(svg, valor, {
        format: 'CODE128',
        lineColor: '#111827',
        background: '#ffffff',
        height,
        width: moduleWidth,
        margin: 4,
        displayValue: true,
        fontSize: 13,
        font: 'monospace',
        textAlign: 'center',
      });
    } catch {
      // Valor no codificable: se deja el SVG vacio, nunca rompe la UI.
      svg.innerHTML = '';
    }
  }, [type, valor, height, moduleWidth]);

  useEffect(() => {
    if (type !== 'qr' || !valor) {
      setQrUrl('');
      return;
    }
    let vivo = true;
    QRCodeLib.toDataURL(valor, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: qrSize,
      color: { dark: '#111827ff', light: '#ffffffff' },
    })
      .then((url) => {
        if (vivo) setQrUrl(url);
      })
      .catch(() => {
        if (vivo) setQrUrl('');
      });
    return () => {
      vivo = false;
    };
  }, [type, valor, qrSize]);

  if (!valor) return null;

  if (type === 'qr') {
    if (!qrUrl) return null;
    return (
      <img
        src={qrUrl}
        alt={`Código QR ${valor}`}
        width={qrSize}
        height={qrSize}
        className={className}
      />
    );
  }

  return <svg ref={svgRef} className={className} />;
}
