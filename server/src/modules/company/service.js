import { CompanyRepository } from './repository.js';

export class CompanyService {
    constructor() {
        this.repository = new CompanyRepository();
    }

    async getCompanyInfo() {
        const info = await this.repository.getCompany();
        return info || {}; // Return empty object if not set
    }

    async updateCompanyInfo(data) {
        return await this.repository.upsert(data);
    }
}
