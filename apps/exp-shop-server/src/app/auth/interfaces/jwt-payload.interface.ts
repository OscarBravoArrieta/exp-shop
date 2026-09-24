/** Forma del payload firmado dentro del JWT (ver AuthService.getJwtToken). */
export interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}
