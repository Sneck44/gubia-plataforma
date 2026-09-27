"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { login } from "@/app/login/actions";
import { Icon } from "./icon";
function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="button button-primary w-full"
      type="submit"
    >
      {pending ? "Verificando acceso…" : "Entrar al panel"}
      <Icon name="arrow" />
    </button>
  );
}
export function LoginForm() {
  const [show, setShow] = useState(false);
  return (
    <form action={login} className="login-form">
      <label>
        Correo electrónico
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="nombre@empresa.mx"
        />
      </label>
      <label htmlFor="password">Contraseña</label>
      <div className="password-field">
        <input
          id="password"
          name="password"
          type={show ? "text" : "password"}
          autoComplete="current-password"
          required
        />
        <button
          type="button"
          aria-pressed={show}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          onClick={() => setShow(!show)}
        >
          {show ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      <Submit />
    </form>
  );
}
