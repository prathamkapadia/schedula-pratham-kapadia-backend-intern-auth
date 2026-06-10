"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesGuard = exports.JwtAuthGuard = exports.JwtStrategy = exports.CurrentUser = exports.Roles = exports.ROLES_KEY = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_2 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const core_1 = require("@nestjs/core");
const common_2 = require("@nestjs/common");
const user_entity_1 = require("../../auth/user.entity");
exports.ROLES_KEY = 'roles';
const Roles = (...roles) => (0, common_2.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;
exports.CurrentUser = (0, common_1.createParamDecorator)((_, ctx) => ctx.switchToHttp().getRequest().user);
let JwtStrategy = class JwtStrategy extends (0, passport_2.PassportStrategy)(passport_jwt_1.Strategy) {
    userRepo;
    constructor(userRepo) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'fallback_secret',
        });
        this.userRepo = userRepo;
    }
    async validate(payload) {
        const user = await this.userRepo.findOne({ where: { id: payload.sub } });
        if (!user)
            throw new common_1.ForbiddenException('User not found');
        return user;
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], JwtStrategy);
let JwtAuthGuard = class JwtAuthGuard extends (0, passport_1.AuthGuard)('jwt') {
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)()
], JwtAuthGuard);
let RolesGuard = class RolesGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(ctx) {
        const required = this.reflector.getAllAndOverride(exports.ROLES_KEY, [
            ctx.getHandler(),
            ctx.getClass(),
        ]);
        if (!required)
            return true;
        const user = ctx.switchToHttp().getRequest().user;
        if (!required.includes(user?.role)) {
            throw new common_1.ForbiddenException(`Access denied. Required: ${required.join(', ')} | Your role: ${user?.role}`);
        }
        return true;
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RolesGuard);
//# sourceMappingURL=auth.guards.js.map