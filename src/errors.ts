export const exitCodes = {
  SUCCESS: 0,
  CLI_ERROR: 1,
  NETWORK_ERROR: 2,
  STREAM_ERROR: 3,
  AUTH_ERROR: 4,
  TIMEOUT: 5,
  DISCOVERY_ERROR: 6,
} as const;

export class HermesError extends Error {
  constructor(
    public readonly code: number,
    message: string
  ) {
    super(message);
    this.name = 'HermesError';
  }
}

export class NetworkError extends HermesError {
  constructor(message: string) {
    super(exitCodes.NETWORK_ERROR, message);
    this.name = 'NetworkError';
  }
}

export class AuthError extends HermesError {
  constructor(message: string) {
    super(exitCodes.AUTH_ERROR, message);
    this.name = 'AuthError';
  }
}

export class StreamError extends HermesError {
  constructor(message: string) {
    super(exitCodes.STREAM_ERROR, message);
    this.name = 'StreamError';
  }
}

export class TimeoutError extends HermesError {
  constructor(message: string) {
    super(exitCodes.TIMEOUT, message);
    this.name = 'TimeoutError';
  }
}

export class DiscoveryError extends HermesError {
  constructor(message: string) {
    super(exitCodes.DISCOVERY_ERROR, message);
    this.name = 'DiscoveryError';
  }
}

export class ValidationError extends HermesError {
  constructor(message: string) {
    super(exitCodes.CLI_ERROR, message);
    this.name = 'ValidationError';
  }
}
