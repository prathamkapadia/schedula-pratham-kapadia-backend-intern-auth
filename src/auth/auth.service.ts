import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { SignupDto, LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({ ...dto, email: dto.email.toLowerCase(), password: hashed });
    const saved = await this.userRepo.save(user);
    const { password, ...safe } = saved;

    return {
      success: true,
      message: `${saved.role} account created successfully`,
      token: this.sign(saved),
      user: safe,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :e', { e: dto.email.toLowerCase() })
      .getOne();

    if (!user || !(await bcrypt.compare(dto.password, user.password)))
      throw new UnauthorizedException('Invalid email or password');

    const { password, ...safe } = user;
    return { success: true, message: `Welcome back, ${user.name}!`, token: this.sign(user), user: safe };
  }

  getMe(user: User) {
    return { success: true, user };
  }

  private sign(user: User) {
    return this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
  }
}