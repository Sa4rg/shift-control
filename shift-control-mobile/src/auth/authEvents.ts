type UnauthorizedHandler = () => void | Promise<void>;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

export function unregisterUnauthorizedHandler(): void {
  unauthorizedHandler = null;
}

export async function notifyUnauthorized(): Promise<void> {
  await unauthorizedHandler?.();
}