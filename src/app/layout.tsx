import "./globals.css";
export const metadata = {
  title: "GUBIA | Plataforma",
  description: "Citas y gestión para GUBIA Análisis Clínicos",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="/gubia-design-v2.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
