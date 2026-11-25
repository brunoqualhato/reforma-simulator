import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Reforma | Simulador tributário', description: 'Simule CBS, IBS e Imposto Seletivo com os motores abertos da Receita Federal.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="pt-BR"><body>{children}</body></html>; }
