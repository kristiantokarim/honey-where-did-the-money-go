import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentHousehold = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (data === 'role') {
      return request.householdRole;
    }
    return request.householdId;
  },
);
