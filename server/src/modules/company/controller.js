import { CompanyService } from './service.js';

export class CompanyController {
    constructor() {
        this.service = new CompanyService();
    }

    getCompanyInfo = async (req, res, next) => {
        try {
            const data = await this.service.getCompanyInfo();
            res.json({
                success: true,
                data,
            });
        } catch (error) {
            next(error);
        }
    };

    updateCompanyInfo = async (req, res, next) => {
        try {
            const data = await this.service.updateCompanyInfo(req.body);
            res.json({
                success: true,
                message: 'Company information updated successfully',
                data,
            });
        } catch (error) {
            next(error);
        }
    };
}
