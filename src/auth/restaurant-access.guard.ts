import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

// Restricts routes like /restaurants/:restaurantId/* to admins (any restaurant)
// or to the caller's own restaurant (e.g. a gerente / branch manager).
@Injectable()
export class RestaurantAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException();
    if (user.role === 'admin') return true;

    const paramRestaurantId = Number(request.params.restaurantId);
    if (!paramRestaurantId || user.restaurantId !== paramRestaurantId) {
      throw new ForbiddenException('No tienes acceso a esta sucursal');
    }
    return true;
  }
}
