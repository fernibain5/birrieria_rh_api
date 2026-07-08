// Shape of `req.user` after JwtAuthGuard runs, populated by JwtStrategy.validate().
export interface RequestUser {
  id: string;
  email: string;
  role: string;
  restaurantId: number | null;
}
