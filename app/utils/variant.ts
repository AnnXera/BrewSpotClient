// Hot or iced, picked at the register for items sold both ways. Mirrors
// TransactionItem::TEMPERATURES on the server.
export type Temperature = 'hot' | 'iced'

export const TEMPERATURE_LABELS: Record<Temperature, string> = { hot: 'Hot', iced: 'Iced' }

// "Iced Large", "Hot", "Large", or '' for a plain item.
export function variantLabel(temperature: string | null | undefined, sizeName: string | null | undefined) {
  const temp = temperature ? (TEMPERATURE_LABELS[temperature as Temperature] ?? temperature) : null
  return [temp, sizeName].filter(Boolean).join(' ')
}
