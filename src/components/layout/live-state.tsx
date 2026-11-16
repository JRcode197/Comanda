"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export function LiveState() {
  const [offline, setOffline] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const update = () => {
      setOffline(!navigator.onLine);
      if (navigator.onLine) router.refresh();
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("focus", update);
    const timer = setInterval(() => {
      if (navigator.onLine) router.refresh();
    }, 60000);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("focus", update);
      clearInterval(timer);
    };
  }, [router]);
  return offline ? (
    <div
      role="alert"
      className="border-b border-amber-500 bg-amber-950 p-4 text-amber-100"
    >
      Sei offline. I dati potrebbero non essere aggiornati. Le scritture sono
      disabilitate.
    </div>
  ) : null;
}
