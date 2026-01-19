import { Router } from 'express';
import { CompanyController } from './controller.js';

const router = Router();
const controller = new CompanyController();

router.get('/', controller.getCompanyInfo);
router.put('/', controller.updateCompanyInfo);
// We can also support POST but PUT is fine for upsert logic

export default router;
