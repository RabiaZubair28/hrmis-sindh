import { Body, Controller, ForbiddenException, Get, Param, Patch, Put, UseGuards } from '@nestjs/common';
import { IsMongoId } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/auth.decorators';
import { Role } from '../common/roles';
import { UsersService } from '../users/users.service';
import { UpsertProfileDto } from './profile.dto';
import { ProfilesService } from './profiles.service';

class UpdateSectionOfficerDto {
  @IsMongoId()
  sectionOfficerId!: string;
}

@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfilesController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly users: UsersService,
  ) {}

  @Get('me')
  get(@CurrentUser() user: any) {
    return this.profiles.findByUser(user.id);
  }

  @Get('employee/:userId')
  employee(@CurrentUser() user: any, @Param('userId') userId: string) {
    const allowed = [Role.MSDHO, Role.SECTION_OFFICER, Role.DEPUTY_SECRETARY, Role.ADDITIONAL_SECRETARY, Role.SPECIAL_SECRETARY, Role.SECRETARY, Role.MINISTER, Role.SUPER_ADMIN];
    if (!allowed.includes(user.role)) throw new ForbiddenException('You are not allowed to view employee profiles');
    return this.profiles.findByUser(userId);
  }

  @Put('me')
  put(@CurrentUser() user: any, @Body() dto: UpsertProfileDto) {
    return this.profiles.upsert(user.id, dto);
  }

  @Get('section-officers')
  async sectionOfficers(@CurrentUser() user: any) {
    const [items, currentUser] = await Promise.all([
      this.users.listSectionOfficers(),
      this.users.findById(user.id),
    ]);
    return {
      items,
      assignedSectionOfficerId: currentUser?.assignedSectionOfficerId?.toString() ?? null,
    };
  }

  @Patch('section-officer')
  async updateSectionOfficer(@CurrentUser() user: any, @Body() dto: UpdateSectionOfficerDto) {
    return this.users.assignSectionOfficer(user.id, dto.sectionOfficerId);
  }
}
