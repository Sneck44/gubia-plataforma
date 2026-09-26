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
      <body>{children}</body>
    </html>
  );
}
