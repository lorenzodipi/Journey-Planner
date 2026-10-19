// Un'altra pagina può chiedere di aprire questa già scorsa fino a un punto preciso (es. la card del cambio
// nel Budget, dalla Home). Il valore si legge una sola volta, all'arrivo sulla pagina.
let target: string | null = null

export function setScrollTarget(id: string): void {
  target = id
}

export function takeScrollTarget(): string | null {
  const id = target
  target = null
  return id
}
