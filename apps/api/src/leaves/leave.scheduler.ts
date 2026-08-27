import { Injectable } from '@nestjs/common'; import { Cron } from '@nestjs/schedule'; import { LeavesService } from './leaves.service';
@Injectable() export class LeaveScheduler { constructor(private readonly leaves:LeavesService){} @Cron('0 * * * *') async run(){await this.leaves.autoForwardExpired();} }
