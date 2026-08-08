"use client";
import { useEffect } from "react";

export default function BackendPing() {
  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL;
    
    async function ping() {
      try {
        await fetch(`${API}/`);
      } catch (err) {}
    }

    ping();
    const interval = setInterval(ping, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
}