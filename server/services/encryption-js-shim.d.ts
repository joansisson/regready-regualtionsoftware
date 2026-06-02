declare module "../../encryption.js" {
  export function encrypt(text: string): string;
  export function decrypt(text: string): string | null;
}
