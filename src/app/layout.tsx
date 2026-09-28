import "./globals.css";
export const metadata = {
  title: "GUBIA | Plataforma",
  appleWebApp: { capable: true, title: "GUBIA", statusBarStyle: "default" as const },
  icons: { apple: "/icons/gubia-192.png" },
  description: "Citas y gestión para GUBIA Análisis Clínicos",
};
export const viewport = { themeColor: "#133f31" };
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="/gubia-design-v3.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
