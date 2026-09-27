import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/icon";
export default function Home() {
  return (
    <main className="welcome-page">
      <header className="welcome-header">
        <Image
          src="/gubia-logo.png"
          alt="GUBIA Análisis Clínicos"
          width={146}
          height={100}
          priority
        />
        <a className="quiet-link" href="https://www.gubia.mx/">
          Sitio institucional <Icon name="arrow" size={16} />
        </a>
      </header>
      <section className="welcome-intro">
        <span className="eyebrow">
          CERCA DE TU SALUD. AL FRENTE DE TU EMPRESA.
        </span>
        <h1>
          Todo conectado.
          <br />
          <span>Todo más sencillo.</span>
        </h1>
        <p>
          Un espacio para gestionar GUBIA y acompañar a cada paciente, desde la
          primera visita hasta su cita.
        </p>
      </section>
      <div className="welcome-options">
        <section className="owner-panel">
          <span className="icon-tile light">
            <Icon name="chart" size={27} />
          </span>
          <p className="eyebrow">PROPIETARIO Y PERSONAL</p>
          <h2>
            Tu operación,
            <br />
            en un solo lugar.
          </h2>
          <p>
            Consulta la agenda, organiza tus sucursales y da seguimiento a tus
            campañas desde el centro de control.
          </p>
          <Link href="/admin" className="button button-white">
            Entrar al centro de control <Icon name="arrow" />
          </Link>
          <span className="panel-footnote">
            <Icon name="shield" size={15} />
            Acceso para personal autorizado
          </span>
        </section>
        <section className="patient-panel card">
          <span className="icon-tile">
            <Icon name="calendar" size={27} />
          </span>
          <p className="eyebrow">PACIENTES</p>
          <h2>
            Tu siguiente paso
            <br />
            para cuidarte.
          </h2>
          <p>
            Encuentra los estudios y horarios habilitados para reservar, o
            revisa los detalles de una cita existente.
          </p>
          <div className="patient-actions">
            <Link href="/agendar" className="button button-primary">
              Agendar una cita <Icon name="arrow" />
            </Link>
            <Link href="/consultar" className="button button-secondary">
              Consultar mi cita
            </Link>
          </div>
          <span className="panel-footnote">
            <Icon name="clock" size={15} />
            Ten a la mano tu folio y clave de consulta
          </span>
        </section>
      </div>
      <footer className="welcome-footer">
        <span>GUBIA · Análisis Clínicos</span>
        <a href="https://www.gubia.mx/">Aviso de privacidad de GUBIA</a>
      </footer>
    </main>
  );
}
