import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toast(title: string, body: string) {
  const event = new CustomEvent('show-notification', {
    detail: { title, body }
  });
  window.dispatchEvent(event);
}
