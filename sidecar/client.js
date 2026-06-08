// Shared OpenCode client instance
let client = null;

export function setClient(newClient) {
  client = newClient;
}

export function getClient() {
  if (!client) {
    throw new Error('OpenCode client not initialized');
  }
  return client;
}
