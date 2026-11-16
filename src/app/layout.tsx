import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Comanda · Operatività",
  description: "Prenotazioni, persone e servizi, nello stesso posto.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <a href="#main" className="skip">
          Vai al contenuto
        </a>
        {children}
      </body>
    </html>
  );
}
