import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { Icon } from "@/components/icon";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const q = await searchParams;
  return (
    <main className="login-page">
      <Link href="/" className="quiet-link login-back">
        ← Volver a GUBIA
      </Link>
      <div className="login-layout">
        <section className="login-story">
          <span className="eyebrow">CENTRO DE CONTROL GUBIA</span>
          <h1>
            Más claridad.
            <br />
            <span>Mejores decisiones.</span>
          </h1>
          <p>
            Tu equipo, tus sucursales y tus campañas, conectados en un mismo
            espacio de trabajo.
          </p>
          <div className="login-features">
            <span>
              <Icon name="calendar" />
              Operación y agenda
            </span>
            <span>
              <Icon name="grid" />
              Campañas y códigos QR
            </span>
            <span>
              <Icon name="chart" />
              Seguimiento comercial
            </span>
          </div>
        </section>
        <section className="card login-card">
          <Image
            src="/gubia-logo.png"
            alt="GUBIA Análisis Clínicos"
            width={120}
            height={82}
            priority
          />
          <h2>Te damos la bienvenida</h2>
          <p>Ingresa con tu cuenta de personal.</p>
          {q.error && (
            <p role="alert" className="form-alert">
              {q.error}
            </p>
          )}
          <LoginForm />
          <div className="login-help">
            <Icon name="shield" size={18} />
            <span>
              ¿Necesitas acceso? Contacta a la persona responsable de
              administrar tu plataforma.
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
