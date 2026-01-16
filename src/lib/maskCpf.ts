import { formatCpfMasked } from "@/lib/processos";

export function maskCpf(value: string) {
  return formatCpfMasked(value);
}
