declare module 'cac' {
  export interface CAC {
    command(name: string, description?: string): CAC;
    option(name: string, description?: string, config?: any): CAC;
    example(example: string): CAC;
    action(handler: (...args: any[]) => any): CAC;
    help(): CAC;
    parse(argv?: string[]): any;
    outputHelp(): void;
    version(version: string): CAC;
  }

  export function cac(name: string): CAC;
  export default cac;
}
