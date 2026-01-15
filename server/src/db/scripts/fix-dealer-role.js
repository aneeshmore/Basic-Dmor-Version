
import db from '../index.js';
import { roles } from '../schema/index.js';
import { eq } from 'drizzle-orm';

async function fixDealerRole() {
    console.log('🔄 Checking Dealer role configuration...');

    try {
        const [dealer] = await db
            .select()
            .from(roles)
            .where(eq(roles.roleName, 'Dealer'));

        if (!dealer) {
            console.error('❌ Dealer role not found!');
            process.exit(1);
        }

        console.log(`PO Current Dealer State: isSalesRole = ${dealer.isSalesRole}`);

        if (dealer.isSalesRole) {
            console.log('🛠️  Updating Dealer role: Setting isSalesRole = false');
            await db
                .update(roles)
                .set({ isSalesRole: false })
                .where(eq(roles.roleId, dealer.roleId));
            console.log('✅ Dealer role updated successfully (isSalesRole = false).');
        } else {
            console.log('✅ Dealer role is already correctly configured (isSalesRole = false).');
        }
    } catch (err) {
        console.error('❌ Error updating role:', err);
    } finally {
        process.exit(0);
    }
}

fixDealerRole();
