import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterStoreDto } from './dto/register-store.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { EmployeeLoginDto } from './dto/employee-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { InventoryPinService } from './inventory-pin.service';
import { VerifyInventoryPinDto } from './dto/verify-inventory-pin.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly inventoryPinService: InventoryPinService,
  ) {}

  @ApiOperation({ summary: 'Register a new store and admin owner' })
  @ApiResponse({ status: 201, description: 'Store successfully registered' })
  @Post('register-store')
  async registerStore(@Body() dto: RegisterStoreDto) {
    return this.authService.registerStore(dto);
  }

  @ApiOperation({ summary: 'Login as a store admin' })
  @ApiResponse({ status: 200, description: 'Returns a JWT access token' })
  @ApiResponse({ status: 401, description: 'Invalid phone number or password' })
  @HttpCode(HttpStatus.OK)
  @Post('login/admin')
  async loginAdmin(@Body() dto: AdminLoginDto) {
    return this.authService.loginAdmin(dto);
  }

  @ApiOperation({ summary: 'Login as an employee' })
  @ApiResponse({ status: 200, description: 'Returns a JWT access token' })
  @ApiResponse({ status: 401, description: 'Invalid phone or pin' })
  @HttpCode(HttpStatus.OK)
  @Post('login/employee')
  async loginEmployee(@Body() dto: EmployeeLoginDto) {
    return this.authService.loginEmployee(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify the store PIN and issue short-lived inventory access',
  })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('inventory-access')
  async getInventoryAccess(
    @CurrentUser() user: any,
    @Body() dto: VerifyInventoryPinDto,
  ) {
    return this.inventoryPinService.issueAccessToken(user.storeId, dto.pin);
  }

  // Dummy route to test JwtAuthGuard and CurrentUser decorator
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user);
  }
}
