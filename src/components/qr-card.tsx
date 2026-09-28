"use client";
import { useState } from "react";
import QRCode from "qrcode";
export function QRCard({ token, name }: { token: string; name: string }) {
  const [preview, setPreview] = useState(""),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false);
  const url = () => window.location.origin + "/r/" + token;
  async function show() {
    try {
      setPreview(
        await QRCode.toDataURL(url(), {
          width: 256,
          margin: 4,
          errorCorrectionLevel: "M",
        }),
      );
    } catch {
      setError("No se pudo generar el QR.");
    }
  }
  async function download(format: "png" | "svg") {
    try {
      const content =
        format === "png"
          ? await QRCode.toDataURL(url(), {
              width: 1024,
              margin: 4,
              errorCorrectionLevel: "M",
            })
          : URL.createObjectURL(
              new Blob(
                [
                  await QRCode.toString(url(), {
                    type: "svg",
                    margin: 4,
                    errorCorrectionLevel: "M",
                  }),
                ],
                { type: "image/svg+xml" },
              ),
            );
      const a = document.createElement("a");
      a.href = content;
      a.download = "GUBIA-" + token + "." + format;
      a.click();
      if (format === "svg")
        setTimeout(() => URL.revokeObjectURL(content), 1000);
    } catch {
      setError("No se pudo descargar.");
    }
  }
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-3 text-sm">
        <button onClick={() => void show()} className="underline">
          Vista previa
        </button>
        <button onClick={() => void download("png")} className="underline">
          PNG
        </button>
        <button onClick={() => void download("svg")} className="underline">
          SVG
        </button>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url());
              setCopied(true);
            } catch {
              setError("No se pudo copiar el enlace.");
            }
          }}
          className="underline"
        >
          {copied ? "Copiado" : "Copiar enlace"}
        </button>
      </div>
      {preview && (
        <img
          src={preview}
          alt={"Código QR: " + name}
          width={180}
          height={180}
        />
      )}
      <a className="break-all text-xs underline" href={"/r/" + token}>
        /r/{token}
      </a>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
