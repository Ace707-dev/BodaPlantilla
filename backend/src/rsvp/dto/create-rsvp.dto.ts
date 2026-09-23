import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateRsvpDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName: string;

  @IsBoolean()
  attending: boolean;

  @IsInt()
  @Min(0)
  @Max(10)
  guestCount: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
