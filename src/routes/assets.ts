// Imports
import { Router } from 'express';
import { RestrictedAccessMiddlewear } from '../middlewear/identitygate';
import { PrismaClient } from '@prisma/client';
import { assert, isnull } from '../utils/general';
import { TokenData } from '../utils/identity';
import winston from 'winston';

// Get database connection
const dbcon = new PrismaClient();

// Create our apps
const app = Router();


export default app;