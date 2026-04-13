export function logInfo(message: string, data?: unknown) {
  console.log(JSON.stringify({ level: 'info', message, data }));
}

export function logError(message: string, error?: unknown) {
  console.error(JSON.stringify({ level: 'error', message, error }));
}
