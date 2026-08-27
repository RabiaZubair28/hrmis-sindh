import { BadRequestException, Body, Controller, Get, Param, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { basename, extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { CurrentUser } from '../common/auth.decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserDocument } from '../users/user.schema';
import { ActOnLeaveDto, CreateLeaveDto } from './dto/leave.dto';
import { LeaveStatus, LeaveType } from './leave.types';
import { LeavesService } from './leaves.service';

@UseGuards(JwtAuthGuard)
@Controller('leaves')
export class LeavesController {
  constructor(private readonly leaves: LeavesService) {}

  @Get('balance')
  balance(@CurrentUser() user: UserDocument) {
    return this.leaves.balance(user.id);
  }

  @Get('options')
  options(@CurrentUser() user: UserDocument) {
    return this.leaves.options(user);
  }

  @Post()
  create(@CurrentUser() user: UserDocument, @Body() dto: CreateLeaveDto) {
    return this.leaves.create(user, dto);
  }

  @Get('mine')
  mine(
    @CurrentUser() user: UserDocument,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('sort') sort = '-createdAt',
    @Query('search') search = '',
    @Query('status') status?: LeaveStatus,
  ) {
    return this.leaves.mine(user, Math.max(1, +page), Math.min(100, Math.max(1, +limit)), sort, search, status);
  }

  @Get('queue')
  queue(
    @CurrentUser() user: UserDocument,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('sort') sort = 'createdAt',
    @Query('search') search = '',
    @Query('type') type?: LeaveType,
  ) {
    return this.leaves.queue(user, Math.max(1, +page), Math.min(100, Math.max(1, +limit)), type, sort, search);
  }

  @Get('requester/:userId')
  requesterHistory(
    @CurrentUser() user: UserDocument,
    @Param('userId') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('sort') sort = '-createdAt',
  ) {
    return this.leaves.requesterHistory(user, userId, Math.max(1, +page), Math.min(100, Math.max(1, +limit)), sort);
  }

  @Get('processed')
  processed(
    @CurrentUser() user: UserDocument,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('sort') sort = '-createdAt',
    @Query('search') search = '',
    @Query('status') status?: LeaveStatus,
  ) {
    return this.leaves.processed(user, Math.max(1, +page), Math.min(100, Math.max(1, +limit)), sort, search, status);
  }

  @Post('attachments')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = process.env.LEAVE_UPLOAD_DIR || join(process.cwd(), 'uploads', 'leave-actions');
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const safeExt = extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png']);
      cb(allowed.has(file.mimetype) ? null : new BadRequestException('Only PDF, JPG, JPEG and PNG files are allowed.'), allowed.has(file.mimetype));
    },
  }))
  uploadAttachment(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Please select a file.');
    return { key: file.filename, name: file.originalname };
  }

  private resolveAttachmentPath(rawKey: string) {
    const decodedKey = decodeURIComponent(String(rawKey || '')).trim();
    if (!decodedKey) throw new BadRequestException('Invalid attachment.');

    // Only ever resolve a filename inside the configured attachment directory.
    // basename() also lets us support older rows that stored a relative path or
    // the original filename instead of the generated storage key.
    const safeKey = basename(decodedKey);
    if (!safeKey || safeKey === '.' || safeKey === '..') {
      throw new BadRequestException('Invalid attachment.');
    }

    const dir = process.env.LEAVE_UPLOAD_DIR || join(process.cwd(), 'uploads', 'leave-actions');
    const path = join(dir, safeKey);
    if (!existsSync(path)) {
      throw new BadRequestException('Attachment file was not found. This may be a legacy attachment created before file storage was enabled.');
    }
    return { path, safeKey };
  }

  @Get('attachment')
  downloadAttachmentByQuery(@Query('key') key: string, @Res() res: Response) {
    const resolved = this.resolveAttachmentPath(key);
    return res.download(resolved.path, resolved.safeKey);
  }

  @Get('attachments/:key')
  downloadAttachment(@Param('key') key: string, @Res() res: Response) {
    const resolved = this.resolveAttachmentPath(key);
    return res.download(resolved.path, resolved.safeKey);
  }

  @Post(':id/action')
  act(@CurrentUser() user: UserDocument, @Param('id') id: string, @Body() dto: ActOnLeaveDto) {
    return this.leaves.act(user, id, dto);
  }
}
