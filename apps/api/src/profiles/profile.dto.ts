import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
class PostingDto {
  @IsString() @MaxLength(80) district!: string; @IsString() @MaxLength(150) facility!: string; @IsString() @MaxLength(120) designation!: string;
  @IsInt() @Min(16) @Max(20) bps!: number; @IsDateString() startMonth!: string; @IsOptional() @IsDateString() endMonth?: string; @IsOptional() @IsBoolean() allowedToWork?: boolean;
}
class QualificationDto { @IsOptional() @IsString() institute?: string; @IsString() degree!: string; @IsOptional() @IsString() specialization?: string; @IsOptional() @IsString() status?: string; @IsDateString() startMonth!: string; }
class PromotionDto { @IsInt() @Min(16) @Max(20) bpsFrom!: number; @IsInt() @Min(16) @Max(20) bpsTo!: number; @IsDateString() promotionMonth!: string; }
class HistoricalLeaveDto { @IsString() leaveType!: string; @IsDateString() startDate!: string; @IsDateString() endDate!: string; }
class TrainingDto { @IsString() title!: string; @IsString() specializedArea!: string; @IsString() institute!: string; @IsDateString() startDate!: string; @IsDateString() endDate!: string; @IsOptional() @IsString() certificateUrl?: string; }
export class UpsertProfileDto {
  @IsString() @MaxLength(80) fullName!: string;
  @IsString() @MaxLength(30) personnelNo!: string;
  @Matches(/^\d{5}-\d{7}-\d$/) cnic!: string;
  @Matches(/^[A-Za-z .'-]+$/) @MaxLength(80) fatherName!: string;
  @IsIn(['Male','Female','Transgender']) gender!: 'Male'|'Female'|'Transgender';
  @IsDateString() dateOfBirth!: string;
  @IsString() @MaxLength(80) domicile!: string;
  @IsIn(['SO-I','SO-II','SO-III','SO-IV','SO-V','SO-VI']) sectionOffice!: string;
  @IsBoolean() serviceRegularized!: boolean;
  @IsOptional() @IsDateString() serviceRegularizationMonth?: string;
  @IsOptional() @IsBoolean() clearedCommissionExam?: boolean;
  @IsDateString() joiningMonth!: string;
  @IsOptional() @IsString() @MaxLength(50) meritNumber?: string;
  @IsString() @MaxLength(100) cadre!: string;
  @IsInt() @Min(16) @Max(20) bps!: number;
  @Matches(/^\+?[0-9]{10,15}$/) contactNumber!: string;
  @IsOptional() @IsString() @MaxLength(50) pmdcNo?: string;
  @IsOptional() @IsDateString() pmdcIssueDate?: string;
  @IsOptional() @IsDateString() pmdcExpiryDate?: string;
  @IsEmail() email!: string;
  @IsString() @MaxLength(300) address!: string;
  @IsOptional() @IsString() cnicFrontUrl?: string;
  @IsOptional() @IsString() cnicBackUrl?: string;
  @IsOptional() @ValidateNested() @Type(() => PostingDto) currentPosting?: PostingDto;
  @IsOptional() @ValidateNested({ each: true }) @Type(() => PostingDto) previousPostings?: PostingDto[];
  @IsOptional() @ValidateNested({ each: true }) @Type(() => QualificationDto) qualifications?: QualificationDto[];
  @IsOptional() @ValidateNested({ each: true }) @Type(() => PromotionDto) promotions?: PromotionDto[];
  @IsOptional() @ValidateNested({ each: true }) @Type(() => HistoricalLeaveDto) historicalLeaves?: HistoricalLeaveDto[];
  @IsOptional() @ValidateNested({ each: true }) @Type(() => TrainingDto) trainings?: TrainingDto[];
}
