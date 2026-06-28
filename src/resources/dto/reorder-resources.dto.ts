import { IsArray, IsString } from 'class-validator';

export class ReorderResourcesDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
