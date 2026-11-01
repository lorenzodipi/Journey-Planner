// Tastiera nell'app iOS: la finestra non si restringe (resize «none»), così sotto non compare mai lo sfondo
// nativo chiaro. L'altezza della tastiera arriva nella variabile CSS --kb: pagine e fogli si alzano di tanto.
export async function setupTastiera(): Promise<void> {
  const { Keyboard } = await import('@capacitor/keyboard')
  const set = (px: number) => document.documentElement.style.setProperty('--kb', `${Math.max(0, Math.round(px))}px`)
  await Keyboard.addListener('keyboardWillShow', (i) => set(i.keyboardHeight))
  await Keyboard.addListener('keyboardWillHide', () => set(0))
}
