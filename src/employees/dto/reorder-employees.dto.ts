import { IsArray, IsInt } from 'class-validator';

export class ReorderEmployeesDto {
  @IsArray()
  @IsInt({ each: true })
  ids: number[];
}
