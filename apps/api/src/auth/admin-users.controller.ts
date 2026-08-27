import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Roles } from '../common/auth.decorators'; import { Role } from '../common/roles'; import { RolesGuard } from '../common/roles.guard'; import { UsersService } from '../users/users.service'; import { JwtAuthGuard } from './jwt-auth.guard';
class UpdateAccessDto { @IsOptional() @IsEnum(Role) role?:Role; @IsOptional() @IsArray() @IsString({each:true}) permissions?:string[]; @IsOptional() @IsBoolean() isActive?:boolean; }
@UseGuards(JwtAuthGuard,RolesGuard) @Roles(Role.SUPER_ADMIN) @Controller('admin/users')
export class AdminUsersController { constructor(private readonly users:UsersService){} @Get() async list(@Query('page')p='1',@Query('limit')l='25'){const page=Math.max(1,+p),limit=Math.min(100,Math.max(1,+l));const [items,total]=await this.users.list(page,limit);return{items,total,page,limit,pages:Math.max(1,Math.ceil(total/limit))}} @Patch(':id/access') update(@Param('id')id:string,@Body()dto:UpdateAccessDto){return this.users.updateAccess(id,dto)} }
